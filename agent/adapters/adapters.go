package adapters

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"os/exec"
	"strings"
	"unicode"
)

const (
	typeEthernet  = "Ethernet"
	typeWireless  = "Wireless"
	typeVirtual   = "Virtual"
	typeBluetooth = "Bluetooth"
	typeVPN       = "VPN"
	typeUnknown   = "Unknown"
)

// Adapter represents a network adapter with metadata.
type Adapter struct {
	Name           string
	Description    string
	Type           string
	MACAddress     string
	Connected      bool
	DHCPEnabled    bool
	IPv4Address    string
	SubnetMask     string
	DefaultGateway string
	DHCPServer     string
	DNSServers     []string
}

// Discover returns adapters discovered from ipconfig output.
func Discover(ctx context.Context) ([]Adapter, error) {
	cmd := exec.CommandContext(ctx, "ipconfig", "/all")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("read ipconfig output: %w", err)
	}

	return parseIPConfig(string(output)), nil
}

// Primary selects a primary adapter based on connectivity and type.
func Primary(adapters []Adapter) (*Adapter, error) {
	if len(adapters) == 0 {
		return nil, fmt.Errorf("no adapters found")
	}

	bestScore := -1
	var best Adapter
	for _, adapter := range adapters {
		score := adapterScore(adapter)
		if score > bestScore {
			bestScore = score
			best = adapter
		}
	}

	return &best, nil
}

func adapterScore(adapter Adapter) int {
	score := 0
	if adapter.Connected {
		score += 50
	}
	if adapter.DefaultGateway != "" {
		score += 20
	}

	switch adapter.Type {
	case typeEthernet:
		score += 15
	case typeWireless:
		score += 10
	case typeVirtual, typeBluetooth, typeVPN:
		score -= 10
	}

	return score
}

func parseIPConfig(output string) []Adapter {
	lines := strings.Split(output, "\n")
	adapters := []Adapter{}

	var current *Adapter
	dnsContinuation := false
	gatewayContinuation := false

	for _, raw := range lines {
		line := strings.TrimRight(raw, "\r")
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			dnsContinuation = false
			gatewayContinuation = false
			continue
		}

		if name, ok := parseAdapterHeader(trimmed); ok {
			adapter := Adapter{
				Name:      name,
				Type:      classifyAdapter(name),
				Connected: true,
			}
			adapters = append(adapters, adapter)
			current = &adapters[len(adapters)-1]
			dnsContinuation = false
			gatewayContinuation = false
			continue
		}

		if current == nil {
			continue
		}

		if dnsContinuation && len(trimmed) > 0 && !unicode.IsLetter(rune(trimmed[0])) {
			current.DNSServers = append(current.DNSServers, trimmed)
			continue
		}

		if strings.Contains(trimmed, ":") {
			key, value := parseKeyValue(trimmed)
			dnsContinuation = false
			gatewayContinuation = false

			switch strings.ToLower(key) {
			case "description":
				current.Description = value
			case "physical address":
				current.MACAddress = normalizeMAC(value)
			case "dhcp enabled":
				current.DHCPEnabled = strings.EqualFold(value, "yes")
			case "ipv4 address":
				current.IPv4Address = trimParen(value)
			case "subnet mask":
				current.SubnetMask = value
			case "default gateway":
				if value != "" {
					current.DefaultGateway = value
				} else {
					gatewayContinuation = true
				}
			case "dhcp server":
				current.DHCPServer = value
			case "dns servers":
				if value != "" {
					current.DNSServers = append(current.DNSServers, value)
				}
				dnsContinuation = true
			case "media state":
				if strings.Contains(strings.ToLower(value), "disconnected") {
					current.Connected = false
				}
			}

			continue
		}

		if dnsContinuation {
			current.DNSServers = append(current.DNSServers, trimmed)
		} else if gatewayContinuation {
			if current.DefaultGateway == "" {
				current.DefaultGateway = trimmed
			}
		}
	}

	return adapters
}

func parseAdapterHeader(line string) (string, bool) {
	if !strings.HasSuffix(line, ":") {
		return "", false
	}

	lower := strings.ToLower(line)
	idx := strings.Index(lower, "adapter ")
	if idx == -1 {
		return "", false
	}

	name := strings.TrimSuffix(line[idx+len("adapter "):], ":")
	name = strings.TrimSpace(name)
	if name == "" {
		return "", false
	}

	return name, true
}

func parseKeyValue(line string) (string, string) {
	parts := strings.SplitN(line, ":", 2)
	key := strings.TrimSpace(strings.TrimRight(parts[0], ". "))
	value := ""
	if len(parts) == 2 {
		value = strings.TrimSpace(parts[1])
	}
	return key, value
}

func normalizeMAC(mac string) string {
	mac = strings.ReplaceAll(mac, "-", ":")
	mac = strings.ToUpper(strings.TrimSpace(mac))
	return mac
}

func trimParen(value string) string {
	if idx := strings.Index(value, "("); idx != -1 {
		return strings.TrimSpace(value[:idx])
	}
	return strings.TrimSpace(value)
}

func classifyAdapter(name string) string {
	lower := strings.ToLower(name)
	switch {
	case strings.Contains(lower, "wi-fi"), strings.Contains(lower, "wireless"):
		return typeWireless
	case strings.Contains(lower, "ethernet"):
		return typeEthernet
	case strings.Contains(lower, "bluetooth"):
		return typeBluetooth
	case strings.Contains(lower, "vpn"):
		return typeVPN
	case strings.Contains(lower, "virtual"):
		return typeVirtual
	default:
		return typeUnknown
	}
}

// FilterIPv4 returns the first valid IPv4 address from the adapter list.
func FilterIPv4(adapters []Adapter) net.IP {
	for _, adapter := range adapters {
		if adapter.IPv4Address == "" {
			continue
		}
		ip := net.ParseIP(adapter.IPv4Address)
		if ip == nil {
			continue
		}
		return ip
	}
	return nil
}

// Hash returns a stable hash for adapter state comparisons.
func Hash(adapters []Adapter) string {
	builder := strings.Builder{}
	for _, adapter := range adapters {
		builder.WriteString(adapter.Name)
		builder.WriteString("|")
		builder.WriteString(adapter.Type)
		builder.WriteString("|")
		builder.WriteString(adapter.MACAddress)
		builder.WriteString("|")
		builder.WriteString(adapter.IPv4Address)
		builder.WriteString("|")
		if adapter.Connected {
			builder.WriteString("1")
		} else {
			builder.WriteString("0")
		}
		builder.WriteString(";")
	}

	sum := sha256.Sum256([]byte(builder.String()))
	return hex.EncodeToString(sum[:])
}
