import { ComponentType } from 'react';
import { KeyValue, MenuType, ResourceAction, Workspace } from '..';
import { Addon } from '../api'

export enum PluginType {
  PageApp = 'page-app',
  Definition = 'definition',
}

interface PluginMetaInfoLink {
  name: string;
  url: string;
}

export interface PluginMetaInfo {
  author: {
    name: string;
    url?: string;
  };
  description: string;
  links: PluginMetaInfoLink[];
  logos: {
    large: string;
    small: string;
  };
  updated: string;
  version: string;
}

interface PluginDependencyInfo {
  id: string;
  name: string;
  version: string;
  type: PluginType;
}

export interface PluginDependencies {
  velauxDependency?: string;
  velauxVersion: string;
  plugins: PluginDependencyInfo[];
}

export interface PluginInclude {
  workspace: Workspace;
  type: MenuType;
  label: string;
  name: string;
  to: string;
  relatedRoute: string[];
  icon: string;
  permission?: ResourceAction;
  catalog?: string;
}

export interface PluginMeta<T extends KeyValue = {}> extends PluginLink, SourceAddon {
  id: string;
  name: string;
  type: PluginType;
  info: PluginMetaInfo;

  // System.load & relative URLS
  module: string;
  baseUrl: string;
  position?: string;

  // Define plugin requirements
  dependencies?: PluginDependencies;

  // Define the menus
  includes?: PluginInclude[];

  // Filled in by the backend
  jsonSetting?: T;
  secureJsonData?: KeyValue;
  secureJsonFields?: KeyValue<boolean>;
  enabled?: boolean;
  defaultNavUrl?: string;
  hasUpdate?: boolean;
  enterprise?: boolean;
  latestVersion?: string;
  live?: boolean;
}

/**
 * Represents a plugin and link to get plugin tarball
 */
export interface PluginLink {
  name: string
  url: string
}

/**
 * Represents a plugin linked to
 */
export interface SourceAddon {
  addon: Addon
}


export interface PluginConfigPageProps<T extends PluginMeta> {
  plugin: VelaUXPlugin<T>;
  query: KeyValue; // The URL query parameters
  onJSONDataChange: (key: string, value: any) => void;
  onSecureJSONDataChange: (key: string, value: any) => void;
}

export interface PluginConfigPage<T extends PluginMeta> {
  title: string; // Display
  icon?: string;
  id: string; // Unique, in URL

  body: ComponentType<PluginConfigPageProps<T>>;
}

// The design was inspired by Grafana. So the field is consistent with Grafana;
export class VelaUXPlugin<T extends PluginMeta = PluginMeta> {
  // Meta is filled in by the plugin loading system
  meta: T;

  // This is set if the plugin system had errors loading the plugin
  loadError?: boolean;

  // Show configuration tabs on the plugin page
  configPages?: PluginConfigPage<T>;

  // Tabs on the plugin page
  addConfigPage(tab: PluginConfigPage<T>) {
    this.configPages = tab;
    return this;
  }

  constructor() {
    this.meta = {} as T;
  }
}

export type PluginEnableRequest = {
  id: string
  jsonData: KeyValue
  secureJsonData: KeyValue
}

export type PluginInstallRequest = {
  id: string
  url: string
}

export type UXPlugin = {
  id: string
  url: string
}
