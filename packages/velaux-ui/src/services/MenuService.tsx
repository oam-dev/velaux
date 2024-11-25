import { Project , ApplicationBase, EnvBinding , Menu, MenuTypes, Workspace , LoginUserInfo } from '@velaux/data';
import * as React from 'react';
import _ from 'lodash';
import { FaLayerGroup } from 'react-icons/fa';
import {
  AiFillCodeSandboxCircle,
  AiFillEnvironment,
  AiFillProject,
  AiFillSetting,
  AiOutlineCluster,
} from 'react-icons/ai';
import { BsFileEarmarkPerson, BsFillFileCodeFill, BsHddNetworkFill, BsPlugin } from 'react-icons/bs';
import { RiUserSettingsFill } from 'react-icons/ri';
import { MdConfirmationNumber } from 'react-icons/md';
import { locationService } from './LocationService';
import { checkPermission } from '../utils/permission';
import { getPluginSrv } from './PluginService';
import { PluginType } from '@velaux/data';


const defaultWorkspaces: Workspace[] = [
  {
    name: 'continuous-delivery',
    label: 'Continuous Delivery',
    rootRoute: '/applications',
    icon: <FaLayerGroup />,
  },

  {
    name: 'extension',
    label: 'Extension',
    rootRoute: '/addons',
    icon: <BsPlugin></BsPlugin>,
  },
  {
    name: 'admin',
    label: 'Admin Dashboard',
    rootRoute: '/clusters',
    icon: <AiFillSetting />,
  },
];

const defaultWorkspaceMenus: Menu[] = [
  {
    workspace: 'continuous-delivery',
    type: MenuTypes.Workspace,
    icon: <FaLayerGroup />,
    name: 'applications',
    label: 'Applications',
    to: '/applications',
    permission: { resource: 'project:?/application:*', action: 'list' },
    relatedRoute: ['/applications'],
  },
  {
    workspace: 'continuous-delivery',
    type: MenuTypes.Workspace,
    name: 'pipeline-list',
    to: '/pipelines',
    relatedRoute: [/projects\/.*\/pipelines\/.*/, '/pipelines'],
    icon: <BsHddNetworkFill></BsHddNetworkFill>,
    label: 'Pipelines',
    permission: { resource: 'project:?/pipeline:*', action: 'list' },
  },
  {
    workspace: 'continuous-delivery',
    to: '/envs',
    type: MenuTypes.Workspace,
    icon: <AiFillEnvironment></AiFillEnvironment>,
    label: 'Environments',
    name: 'env-list',
    permission: { resource: 'project:?/environment:*', action: 'list' },
    relatedRoute: ['/envs'],
  },
  {
    workspace: 'continuous-delivery',
    type: MenuTypes.Workspace,
    to: '/targets',
    icon: <AiFillCodeSandboxCircle></AiFillCodeSandboxCircle>,
    label: 'Targets',
    name: 'target-list',
    permission: { resource: 'target:*', action: 'list' },
    relatedRoute: ['/targets'],
  },
  {
    workspace: 'continuous-delivery',
    type: MenuTypes.Workspace,
    icon: <AiFillProject></AiFillProject>,
    name: 'projects',
    label: 'Projects',
    to: '/projects',
    relatedRoute: ['/projects'],
  },
  {
    workspace: 'extension',
    type: MenuTypes.Workspace,
    to: '/addons',
    icon: <BsPlugin></BsPlugin>,
    label: 'Addons',
    name: 'addon-list',
    permission: { resource: 'addon:*', action: 'list' },
    relatedRoute: ['/addons', /\/manage\/plugins.*/],
  },
  {
    workspace: 'extension',
    type: MenuTypes.Workspace,
    to: '/definitions',
    icon: <BsFillFileCodeFill></BsFillFileCodeFill>,
    label: 'Definitions',
    name: 'definition-list',
    permission: { resource: 'definition:*', action: 'list' },
    relatedRoute: ['/definitions'],
  },
  {
    type: MenuTypes.Workspace,
    workspace: 'admin',
    to: '/clusters',
    icon: <AiOutlineCluster />,
    label: 'Clusters',
    name: 'cluster-list',
    permission: { resource: 'cluster:*', action: 'list' },
    relatedRoute: ['/clusters'],
  },
  {
    workspace: 'admin',
    type: MenuTypes.Workspace,
    to: '/configs',
    icon: <MdConfirmationNumber></MdConfirmationNumber>,
    label: 'Global Configs',
    name: 'configs',
    permission: { resource: 'config:*', action: 'list' },
    relatedRoute: ['/configs'],
  },
  {
    workspace: 'admin',
    type: MenuTypes.Workspace,
    to: '/platform/projects',
    icon: <AiFillProject></AiFillProject>,
    label: 'Projects',
    name: 'project-list',
    permission: { resource: 'project:*', action: 'list' },
    relatedRoute: ['/platform/projects$'],
  },
  {
    workspace: 'admin',
    type: MenuTypes.Workspace,
    to: '/users',
    icon: <RiUserSettingsFill></RiUserSettingsFill>,
    label: 'Users',
    name: 'user-list',
    permission: { resource: 'user:*', action: 'list' },
    relatedRoute: ['/users'],
  },
  {
    workspace: 'admin',
    type: MenuTypes.Workspace,
    to: '/roles',
    icon: <BsFileEarmarkPerson></BsFileEarmarkPerson>,
    label: 'Platform Roles',
    name: 'role-list',
    permission: { resource: 'role:*', action: 'list' },
    relatedRoute: ['^/roles$'],
  },
  {
    workspace: 'admin',
    type: MenuTypes.Workspace,
    to: '/settings',
    icon: <AiFillSetting></AiFillSetting>,
    label: 'Settings',
    name: 'settings',
    permission: { resource: 'systemSetting', action: 'update' },
    relatedRoute: ['/settings'],
  },
];

export type LeftMenu = {
  catalog?: string;
  menus: Menu[];
};

/**
 * @public
 * A wrapper to generate the menu configs
 */
export interface MenuService {
  loadWorkspaces(user?: LoginUserInfo): Workspace[];

  loadCurrentWorkspace(): Workspace | undefined;

  loadMenus(workspace: Workspace, user: LoginUserInfo): LeftMenu[];

  loadProjectMenus(p: Project): Menu[];

  loadApplicationEnvMenus(p: Project, app: ApplicationBase, env: EnvBinding): Menu[];

  loadPluginMenus(): Promise<Menu[]>;

  resetPluginMenus(): void;
}

/** @internal */
export class MenuWrapper implements MenuService {
  private menus: Menu[];
  private workspaces: Workspace[];
  private pluginLoaded: boolean;

  constructor() {
    this.menus = _.cloneDeep(defaultWorkspaceMenus);
    this.workspaces = _.cloneDeep(defaultWorkspaces);
    this.pluginLoaded = false;
  }

  loadPluginMenus = () => {
    if (this.pluginLoaded) {
      return Promise.resolve(this.menus);
    }
    return getPluginSrv()
      .listAppPagePlugins(PluginType.PageApp)
      .then((plugins) => {
        plugins.map((plugin) => {
          plugin.includes?.map((include) => {
            if (!this.workspaces.find((w) => w.name === include.workspace.name)) {
              include.workspace.rootRoute = include.to;
              this.workspaces.push(include.workspace);
            }
            if (!this.menus.find((m) => m.name == include.name)) {
              const pluginMenu: Menu = {
                workspace: include.workspace.name,
                type: include.type,
                name: include.name,
                label: include.label,
                to: include.to,
                relatedRoute: include.relatedRoute,
                permission: include.permission,
                catalog: include.catalog,
              };
              this.menus.push(pluginMenu);
            }
          });
        });
        this.pluginLoaded = true;
        return Promise.resolve(this.menus);
      });
  };

  resetPluginMenus = () => {
    this.pluginLoaded = false;
    this.menus = _.cloneDeep(defaultWorkspaceMenus);
    this.workspaces = _.cloneDeep(defaultWorkspaces);
  }
  getWorkspace(name: string): Workspace | undefined {
    return this.workspaces.find((w) => w.name == name);
  }

  // This function should be called after calling the loadPluginMenus function
  loadCurrentWorkspace(): Workspace | undefined {
    let w: Workspace | undefined = undefined;
    this.menus.map((m) => {
      if (!w && this.matchMenu(m)) {
        w = this.getWorkspace(m.workspace);
      }
    });
    return w;
  }

  loadWorkspaces(user?: LoginUserInfo): Workspace[] {
    const availableWorkspaces = this.workspaces.filter((ws) => this.loadMenus(ws, user).length > 0);
    return availableWorkspaces;
  }

  // This function should be called after calling the loadPluginMenus function
  loadMenus(workspace: Workspace, user?: LoginUserInfo): LeftMenu[] {
    let menus: LeftMenu[] = [];
    this.menus
      .filter((menu) => menu.workspace == workspace.name)
      .map((menu) => {
        if (!checkPermission(menu.permission, '?', user)) {
          return;
        }
        const catalog = menus.filter((m) => m.catalog == menu.catalog);
        const newMenu = Object.assign(menu, { active: this.matchMenu(menu) });
        if (catalog && catalog.length > 0) {
          catalog[0].menus.push(newMenu);
        } else {
          menus.push({ catalog: menu.catalog, menus: [newMenu] });
        }
      });
    return menus;
  }

  matchMenu(menu: Menu): boolean {
    const currentPath = locationService.getPathName();
    let matched = false;
    menu.relatedRoute?.map((route) => {
      if (currentPath.match(route)) {
        matched = true;
      }
    });
    return matched;
  }

  loadProjectMenus(p: Project): Menu[] {
    return [];
  }

  loadApplicationEnvMenus(p: Project, app: ApplicationBase, env: EnvBinding): Menu[] {
    return [];
  }
}

/**
 * @public
 */
export let menuService: MenuService = new MenuWrapper();
