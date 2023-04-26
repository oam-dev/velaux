import {detailPlugin, disablePlugin, enablePlugin, getPluginList, installPlugin, uninstallPlugin} from "../api/plugin";

export default {
  namespace: 'plugins',
  state: {
    pluginList: [],
    enabledPlugins: [],
  },
  reducers: {
    updatePluginList(state, {type, payload}) {
      // update the enabledPlugins
      const enabledPlugins = payload.plugins.filter(plugin => plugin.enabled);
      return {
        ...state,
        pluginList: payload.plugins || [],
        enabledPlugins: enabledPlugins,
      };
    },
    addOrUpdatePlugin(state, {type, payload}) {
      // add the plugin to pluginList if not exist
      const pluginList = state.pluginList;
      const plugin = payload;
      const newPluginList = pluginList.map((p) => {
        if (p.id === plugin.id) {
          return plugin;
        } else {
          return p;
        }
      })
      return {
        ...state,
        pluginList: newPluginList,
      }
    },
    addPluginToEnableList(state, {type, payload}) {
      // add the plugin to enabledPlugins if not exist
      const enabledPlugins = state.enabledPlugins;
      const plugin = payload;
      if (!enabledPlugins.find(p => p.id === plugin.id)) {
        enabledPlugins.push(plugin);
      }
      return {
        ...state,
        enabledPlugins: enabledPlugins,
      }
    },
    removePluginFromEnableList(state, {type, payload}) {
      // remove the plugin from enabledPlugins if exist
      const plugin = payload;
      const newEnabledPlugins = state.enabledPlugins.filter((p) => p.id !== plugin.id);

      return {
        ...state,
        enabledPlugins: newEnabledPlugins,
      };
    },
    addBatchPluginToCache(state, {type, payload}) {
      // add the plugin to pluginList if not exist
      const pluginList = state.pluginList;
      const enabledPlugins = state.enabledPlugins
      console.log(pluginList)
      console.log('payload', payload)
      // make a copy to newPluginList
      const newPluginList = pluginList.slice();
      // merge payload to newPluginList
      for (const plugin of payload) {
        let idx = newPluginList.findIndex(p => p.id === plugin.id)
        if (idx === -1) {
          console.log(plugin, 'added')
          newPluginList.push(plugin);
          if (plugin.enabled) {
            enabledPlugins.push(plugin);
          }
        } else {
          const _old = newPluginList[idx]
          const _new = {..._old, ...plugin}
          console.log(plugin, 'enabled')
          enabledPlugins[idx] = _new
        }
      }
      console.log(newPluginList, enabledPlugins);
      return {
        ...state,
        pluginList: newPluginList,
        enabledPlugins: enabledPlugins,
      }
    },
    removePluginDetail(state, {type, payload}) {
      // remove the plugin from pluginList if exist
      const pluginList = state.pluginList;
      const {id} = payload;
      const newPluginList = pluginList.map((p) => {
        if (p.id === id) {
          return {
            id: p.id,
            url: p.url,
          }
        } else {
          return p;
        }
      })
      return {
        ...state,
        pluginList: newPluginList,
      }
    },
  },
  effects: {
    * installPlugin(action, {call, put}) {
      try {
        const res = yield call(installPlugin, action.payload);
        if (res && res.info) {
          // There's no url in returned plugin object, so we need to set it after calling
          res.url = action.payload.url
          yield put({type: 'addOrUpdatePlugin', payload: res});
          yield put({type: 'addPluginToEnableList', payload: res});
          if (action.callback) {
            action.callback();
          }
        }
      } catch (e) {
        console.log('Error in installPlugin:', e)
      }
    },
    * uninstallPlugin(action, {call, put}) {
      yield call(uninstallPlugin, action.payload);
      yield put({type: 'removePluginDetail', payload: action.payload})
      if (action.callback) {
        action.callback();
      }
    },
    * getPluginList(action, {call, put}) {
      const res = yield call(getPluginList, action.payload);
      console.log(res)
      if (res) {
        yield put({type: 'addBatchPluginToCache', payload: res.plugins});
      }
    },
    * detailPlugin(action, {call, put}) {
      const res = yield call(detailPlugin, action.payload);
      if (res) {
        yield put({type: 'addOrUpdatePlugin', payload: res});
      }
    },
    * enablePlugin(action, {call, put}) {
      const res = yield call(enablePlugin, action.payload);
      if (res.info) {
        yield put({type: 'addPluginToEnableList', payload: res});
      }
      if (action.callback) {
        action.callback();
      }
    },
    * disablePlugin(action, {call, put}) {
      const res = yield call(disablePlugin, action.payload);
      if (res) {
        yield put({type: 'removePluginFromEnableList', payload: res});
      }
      if (action.callback) {
        action.callback();
      }
    }
  }
}
