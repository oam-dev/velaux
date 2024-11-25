/*
Copyright 2023 The KubeVela Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package types

import (
	rbacv1 "k8s.io/api/rbac/v1"
)

// PluginProxyRoutePath the route prefix to request the plugin backend server.
const PluginProxyRoutePath = "/proxy/plugins/"

// Plugin VelaUX plugin model
type Plugin struct {
	JSONData
	PluginDir     string
	Class         Class
	DefaultNavURL string
	// SystemJS fields
	Module  string
	BaseURL string
}

// BuildInfo the plugin build info
type BuildInfo struct {
	Time   int64  `json:"time,omitempty"`
	Repo   string `json:"repo,omitempty"`
	Branch string `json:"branch,omitempty"`
	Hash   string `json:"hash,omitempty"`
}

// InfoLink the link model
type InfoLink struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// Logos the log model
type Logos struct {
	Small string `json:"small"`
	Large string `json:"large"`
}

// Screenshots the screenshot model
type Screenshots struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// Info the info model
type Info struct {
	Author      InfoLink      `json:"author"`
	Description string        `json:"description"`
	Links       []InfoLink    `json:"links"`
	Logos       Logos         `json:"logos"`
	Build       BuildInfo     `json:"build"`
	Screenshots []Screenshots `json:"screenshots"`
	Version     string        `json:"version"`
	Updated     string        `json:"updated"`
}

// Requirement the plugin requirement
type Requirement struct {
	VelaUXVersion string `json:"velauxVersion"`
}

// JSONData represents the plugin's plugin.json
type JSONData struct {
	ID   string `json:"id"`
	Type Type   `json:"type"`
	// there are four sub types in the definition plugin type, includes: component, trait, policy ,and workflow-step.
	SubType  string      `json:"subType"`
	Name     string      `json:"name"`
	Position string      `json:"position"`
	Info     Info        `json:"info"`
	Includes []*Includes `json:"includes"`
	Category string      `json:"category"`
	// Backend If the plugin has a backend component.
	Backend     bool              `json:"backend"`
	Proxy       bool              `json:"proxy"`
	BackendType BackendType       `json:"backendType"`
	AuthType    AuthType          `json:"authType,omitempty"`
	AuthSecret  *KubernetesSecret `json:"authSecret,omitempty"`
	// For the kube auth type, define the max scope permission for this plugin.
	KubePermissions []rbacv1.PolicyRule `json:"kubePermissions,omitempty"`
	// For the KubeService backend type
	BackendService *KubernetesService `json:"backendService"`
	// Routes define the route to proxy the backend server.
	Routes      []*Route     `json:"routes,omitempty"`
	Requirement *Requirement `json:"requirement,omitempty"`
}

// Includes means the menus that this plugin include.
type Includes struct {
	Name         string      `json:"name"`
	Label        string      `json:"label"`
	To           string      `json:"to"`
	Type         string      `json:"type"`
	Icon         string      `json:"icon"`
	Workspace    Workspace   `json:"workspace"`
	Permission   *Permission `json:"permission,omitempty"`
	RelatedRoute []string    `json:"relatedRoute"`
	Catalog      string      `json:"catalog,omitempty"`
}

// Workspace the workspace menu
type Workspace struct {
	Name string `json:"name"`
}

// Permission RBAC permission policy
type Permission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// Route describes a plugin route that is defined in
// the plugin.json file for a plugin.
type Route struct {
	// Route conditions.
	// Path format like: /nodes/:nodeName
	Path   string `json:"path"`
	Method string `json:"method"`

	// Permission checking
	ResourceMap map[string]string `json:"resourceMap,omitempty"`
	Permission  *Permission       `json:"permission,omitempty"`

	// Proxy parameters
	ProxyHeaders []Header `json:"headers,omitempty"`
}

// KubernetesService define one kubernetes service
type KubernetesService struct {
	Name string `json:"name"`
	// If namespace is not specified, find the service from the vela system namespace
	Namespace string `json:"namespace"`
	// If port is not specified, find the first port from the service
	Port int32 `json:"port"`
}

// KubernetesSecret define one kubernetes secret
type KubernetesSecret struct {
	Name string `json:"name"`
	// If namespace is not specified, find the service from the vela system namespace
	Namespace string `json:"namespace"`
}

// AuthType The authentication type of the backend server
type AuthType string

// BackendType the backend server type
type BackendType string

var (
	// Basic Authentication is a method to provide a username and password when making a request.
	Basic AuthType = "basic"
)
var (
	// KubeAPI Proxy the Kubernetes API.
	// this plugin need to define the permission of Kubernetes RBAC.
	// When installing the plugin, Vela will create a Role and use this role to request the Kubernetes API.
	KubeAPI BackendType = "kube-api"
	// KubeService Discover the backend by the Kubernetes service.
	KubeService BackendType = "kube-service"
	// StaticServer Discover the backend by the plugin setting
	StaticServer BackendType = "static-server"
)

// BasicAuth username
type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Header describes an HTTP header that is forwarded with
// the proxied request for a plugin route
type Header struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// JWTTokenAuth struct is both for normal Token Auth and JWT Token Auth with
// an uploaded JWT file.
type JWTTokenAuth struct {
	URL    string            `json:"url"`
	Scopes []string          `json:"scopes"`
	Params map[string]string `json:"params"`
}

// PluginID return the plugin ID
func (p *Plugin) PluginID() string {
	return p.ID
}

// StaticRoute -
type StaticRoute struct {
	PluginID  string
	Directory string
}

// StaticRoute generate the plugin static file route
func (p *Plugin) StaticRoute() *StaticRoute {
	if p.IsCorePlugin() {
		return nil
	}

	return &StaticRoute{Directory: p.PluginDir, PluginID: p.ID}
}

// IsPageApp checking the plugin whether is the page app plugin
func (p *Plugin) IsPageApp() bool {
	return p.Type == PageApp
}

// IsCorePlugin checking the plugin whether is the core plugin
func (p *Plugin) IsCorePlugin() bool {
	return p.Class == Core
}

// IsExternalPlugin checking the plugin whether is the external plugin
func (p *Plugin) IsExternalPlugin() bool {
	return p.Class == External
}

// Class -
type Class string

const (
	// Core plugin, the plugins belong to this class will be installed default.
	Core Class = "core"
	// External plugin, installed from the community registry.
	External Class = "external"
)

// PluginTypes plugin type definition
var PluginTypes = []Type{
	PageApp,
	Definition,
}

// Type the plugin type
type Type string

const (
	// PageApp means plugin provide a independent page. The route maybe like `/plugins/{pluginID}`
	PageApp Type = "page-app"
	// Definition means the plugin provides a UI component for the component，trait, workflow-step, and policy definitions.
	Definition Type = "definition"
)

// IsValid checking the plugin type
func (pt Type) IsValid() bool {
	switch pt {
	case PageApp:
		return true
	case Definition:
		return true
	}
	return false
}

// PluginSource the plugin source.
type PluginSource struct {
	Class Class
	Paths []string
}
