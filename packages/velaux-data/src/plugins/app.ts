import { ComponentType } from 'react';
import { PluginMeta, VelaUXPlugin } from './types';
import { KeyValue } from '../types';

export interface AppPluginMeta<T extends KeyValue = KeyValue> extends PluginMeta<T> {
  // TODO anything specific to apps?
}

export interface PluginRootProps<T extends KeyValue = KeyValue>{
  meta: AppPluginMeta<T>;
}

export interface PageRootProps<T extends KeyValue = KeyValue> extends PluginRootProps<T>{
  /**
   * base URL segment for an app, /app/pluginId
   */
  basename: string; // The URL path to this page
}

export interface DefinitionRootProps<T extends KeyValue = KeyValue> extends PluginRootProps<T> {
  // form props
  "data-meta"?: string;

  project?: string;

  id?: string;

  onChange?: Function;

  registerForm?: Function;

  value?: any;

  ref?: any;
}

export interface AppRootProps<T extends KeyValue = KeyValue> extends DefinitionRootProps<T>, PageRootProps<T>{
  
}

export class AppPagePlugin<T extends KeyValue = KeyValue> extends VelaUXPlugin<AppPluginMeta<T>> {
  // Content under: /a/${plugin-id}/*
  root?: ComponentType<AppRootProps<T>>;

  /**
   * Called after the module has loaded, and before the app is used.
   * This function may be called multiple times on the same instance.
   * The first time, `this.meta` will be undefined
   */
  init(meta: AppPluginMeta) {}

  /**
   * Set the component displayed under:
   *   /a/${plugin-id}/*
   *
   * If the NavModel is configured, the page will have a managed frame, otheriwse it has full control.
   */
  setRootPage(root: ComponentType<AppRootProps<T>>) {
    this.root = root;
    return this;
  }
}
