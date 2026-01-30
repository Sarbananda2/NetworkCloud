package control

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"networkcloud-agent/adapters"
	"networkcloud-agent/api"
	"networkcloud-agent/state"
	"networkcloud-agent/token"
)

const DefaultAddress = "127.0.0.1:17880"

// Server hosts the local control API.
type Server struct {
	addr     string
	token    string
	server   *http.Server
	listener net.Listener
	state    *state.Machine
	stopFn   func()
	baseURL  string
	logPath  string

	mu       sync.Mutex
	pending  *pendingLink
	shutdown chan struct{}
}

// NewServer creates a control server bound to the given address.
func NewServer(addr string, baseURL string, logPath string, stateMachine *state.Machine, stopFn func()) (*Server, error) {
	if addr == "" {
		addr = DefaultAddress
	}

	controlToken, err := LoadOrCreateToken()
	if err != nil {
		return nil, err
	}

	return &Server{
		addr:     addr,
		token:    controlToken,
		state:    stateMachine,
		stopFn:   stopFn,
		baseURL:  baseURL,
		logPath:  logPath,
		shutdown: make(chan struct{}),
	}, nil
}

// Start begins listening for control API requests.
func (s *Server) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/status", s.auth(s.handleStatus))
	mux.HandleFunc("/link/start", s.auth(s.handleLinkStart))
	mux.HandleFunc("/link/status", s.auth(s.handleLinkStatus))
	mux.HandleFunc("/unlink", s.auth(s.handleUnlink))
	mux.HandleFunc("/start", s.auth(s.handleStart))
	mux.HandleFunc("/stop", s.auth(s.handleStop))
	mux.HandleFunc("/logs/tail", s.auth(s.handleLogsTail))
	mux.HandleFunc("/network", s.auth(s.handleNetwork))

	s.server = &http.Server{
		Addr:    s.addr,
		Handler: mux,
	}

	listener, err := net.Listen("tcp", s.addr)
	if err != nil {
		return fmt.Errorf("listen control api: %w", err)
	}
	s.listener = listener

	go func() {
		_ = s.server.Serve(listener)
		close(s.shutdown)
	}()

	return nil
}

// Shutdown stops the control server.
func (s *Server) Shutdown(ctx context.Context) error {
	if s.server == nil {
		return nil
	}
	return s.server.Shutdown(ctx)
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Control-Token") != s.token {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *Server) handleStatus(w http.ResponseWriter, _ *http.Request) {
	stored, err := token.Load()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, StatusResponse{
			State:   string(s.state.Get()),
			Message: err.Error(),
		})
		return
	}

	if stored == nil {
		writeJSON(w, http.StatusOK, StatusResponse{
			State:  string(s.state.Get()),
			Linked: false,
		})
		return
	}

	writeJSON(w, http.StatusOK, StatusResponse{
		State:      string(s.state.Get()),
		Linked:     true,
		AgentUUID:  stored.AgentUUID,
		ObtainedAt: stored.ObtainedAt.Format(time.RFC3339),
	})
}

func (s *Server) handleNetwork(w http.ResponseWriter, r *http.Request) {
	adapterList, err := adapters.Discover(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
		return
	}

	primary, err := adapters.Primary(adapterList)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
		return
	}

	response := NetworkResponse{
		Primary:  toAdapterInfo(primary),
		Adapters: toAdapterInfos(adapterList),
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) handleLinkStart(w http.ResponseWriter, r *http.Request) {
	client := api.NewClient(s.baseURL, "")
	hostname, macAddress, err := deviceIdentity(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, LinkStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	resp, err := client.RequestDeviceCode(r.Context(), hostname, macAddress)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, LinkStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	s.mu.Lock()
	s.pending = &pendingLink{
		deviceCode: resp.DeviceCode,
		interval:   resp.Interval,
		expiresAt:  time.Now().Add(time.Duration(resp.ExpiresIn) * time.Second),
	}
	s.mu.Unlock()

	s.state.Set(state.StateAwaitingCode)
	writeJSON(w, http.StatusOK, LinkStartResponse{
		VerificationURI: resp.VerificationURI,
		UserCode:        resp.UserCode,
		ExpiresIn:       resp.ExpiresIn,
		Interval:        resp.Interval,
	})
}

func (s *Server) handleLinkStatus(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	pending := s.pending
	s.mu.Unlock()

	if pending == nil {
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "idle",
		})
		return
	}

	if time.Now().After(pending.expiresAt) {
		s.clearPending()
		s.state.Set(state.StateIdle)
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "expired",
		})
		return
	}

	client := api.NewClient(s.baseURL, "")
	resp, _, err := client.RequestDeviceToken(r.Context(), pending.deviceCode)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, LinkStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	switch resp.Error {
	case "":
		if resp.AccessToken == "" || resp.AgentUUID == "" {
			writeJSON(w, http.StatusOK, LinkStatusResponse{
				Status:  "error",
				Message: "missing token response",
			})
			return
		}
		if err := token.Save(token.StoredToken{
			AccessToken: resp.AccessToken,
			AgentUUID:   resp.AgentUUID,
			ObtainedAt:  time.Now().UTC(),
		}); err != nil {
			writeJSON(w, http.StatusInternalServerError, LinkStatusResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		s.clearPending()
		s.state.Set(state.StateAuthorized)
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "authorized",
		})
	case "authorization_pending":
		s.state.Set(state.StatePolling)
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "pending",
		})
	case "slow_down":
		s.bumpInterval()
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "pending",
		})
	case "expired_token":
		s.clearPending()
		s.state.Set(state.StateIdle)
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "expired",
		})
	case "access_denied":
		s.clearPending()
		s.state.Set(state.StateIdle)
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "denied",
		})
	default:
		writeJSON(w, http.StatusOK, LinkStatusResponse{
			Status: "error",
			Error:  resp.Error,
		})
	}
}

func (s *Server) handleUnlink(w http.ResponseWriter, _ *http.Request) {
	if err := token.Clear(); err != nil {
		writeJSON(w, http.StatusInternalServerError, LinkStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	s.state.Set(state.StateIdle)
	writeJSON(w, http.StatusOK, LinkStatusResponse{
		Status: "unlinked",
	})
}

func (s *Server) handleStart(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, LinkStatusResponse{
		Status: "running",
	})
}

func (s *Server) handleStop(w http.ResponseWriter, _ *http.Request) {
	if s.stopFn != nil {
		s.stopFn()
	}
	writeJSON(w, http.StatusOK, LinkStatusResponse{
		Status: "stopping",
	})
}

func (s *Server) handleLogsTail(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(s.logPath) == "" {
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "log file not configured",
		})
		return
	}

	lines, err := tailFile(s.logPath, 200)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"message": err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string][]string{
		"lines": lines,
	})
}


func (s *Server) clearPending() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pending = nil
}

func (s *Server) bumpInterval() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.pending == nil {
		return
	}
	s.pending.interval += 5
}

func deviceIdentity(ctx context.Context) (string, string, error) {
	hostname, err := osHostname()
	if err != nil {
		return "", "", err
	}

	adapterList, err := adapters.Discover(ctx)
	if err != nil {
		return "", "", err
	}
	primary, err := adapters.Primary(adapterList)
	if err != nil {
		return "", "", err
	}

	if primary.MACAddress == "" {
		return hostname, "", fmt.Errorf("no suitable network interface found")
	}

	return hostname, primary.MACAddress, nil
}

func osHostname() (string, error) {
	name, err := os.Hostname()
	if err != nil {
		return "", fmt.Errorf("read hostname: %w", err)
	}
	return strings.TrimSpace(name), nil
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func tailFile(path string, maxLines int) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read log file: %w", err)
	}

	lines := strings.Split(strings.TrimRight(string(data), "\n"), "\n")
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
	}
	return lines, nil
}

func toAdapterInfo(adapter *adapters.Adapter) *AdapterInfo {
	if adapter == nil {
		return nil
	}
	info := AdapterInfo{
		Name:           adapter.Name,
		Description:    adapter.Description,
		Type:           adapter.Type,
		MACAddress:     adapter.MACAddress,
		Connected:      adapter.Connected,
		DHCPEnabled:    adapter.DHCPEnabled,
		IPv4Address:    adapter.IPv4Address,
		SubnetMask:     adapter.SubnetMask,
		DefaultGateway: adapter.DefaultGateway,
		DHCPServer:     adapter.DHCPServer,
		DNSServers:     adapter.DNSServers,
	}
	return &info
}

func toAdapterInfos(adaptersList []adapters.Adapter) []AdapterInfo {
	infos := make([]AdapterInfo, 0, len(adaptersList))
	for _, adapter := range adaptersList {
		info := AdapterInfo{
			Name:           adapter.Name,
			Description:    adapter.Description,
			Type:           adapter.Type,
			MACAddress:     adapter.MACAddress,
			Connected:      adapter.Connected,
			DHCPEnabled:    adapter.DHCPEnabled,
			IPv4Address:    adapter.IPv4Address,
			SubnetMask:     adapter.SubnetMask,
			DefaultGateway: adapter.DefaultGateway,
			DHCPServer:     adapter.DHCPServer,
			DNSServers:     adapter.DNSServers,
		}
		infos = append(infos, info)
	}
	return infos
}

