import { AppPagePlugin, PluginMeta } from '@velaux/data';
import * as React from 'react';
import { Translation } from '../../components';
import { locationService } from '../../services';
import { getPluginSrv, importAppPagePlugin } from '../../services/PluginService';
import { Box, Button, Divider, Grid, Loading, Message, Tab } from "@alifd/next";
import './index.less'
import { connect } from "dva";
import { renderIcon } from "../../utils/icon";

interface Props {
  pluginId: string;
  dispatch: any;
  pluginList: PluginMeta[];
  loading: any;
  project?: string;
}

interface DefinitinProps {
  pluginId: string;
  project?: string;
}

function RootPage({ pluginId, ...rest }: Props | DefinitinProps, ref: React.ForwardedRef<any>) {
  const [app, setApp] = React.useState<AppPagePlugin>();
  React.useEffect(() => {
    loadAppPlugin(pluginId, setApp);
  }, [pluginId]);
  if (!app || !app.root) {
    return (
      <div>
        <Translation>No root app page component found</Translation>
      </div>
    );
  }

  const AppRootPage = app.root
  return (
    <div>
      <AppRootPage meta={app.meta} basename={locationService.getLocation().pathname} {...rest} ref={ref}/>
    </div>
  );
}

enum types {
  UPDATE_META
}

function ConfigPage({ pluginId, dispatch, pluginList, loading }: Props) {
  const [app, setApp] = React.useState<AppPagePlugin>();
  const _meta = pluginList.filter(item => item.id === pluginId)[0]
  const updateMeta = (previousState: any, action: any) => {
    if (action.type == types.UPDATE_META) {
      return { ...previousState, ...action.payload }
    }
    throw new Error('Unknown action type')
  }
  const [meta, dispatchMeta] = React.useReducer(updateMeta, _meta);

  const handleJSONChange = (key: string, value: any) => {
    const newJsonData = { ...meta.jsonSetting }
    newJsonData[key] = value
    meta.jsonSetting = newJsonData
    setApp({ ...app, meta: meta } as AppPagePlugin)
  }
  const handleSecureJSONChange = (key: string, value: any) => {
    const newSecureJsonData = { ...meta.secureJsonData }
    newSecureJsonData[key] = value
    meta.secureJsonData = newSecureJsonData
    setApp({ ...app, meta: meta } as AppPagePlugin)
  }

  // Get PluginMeta
  React.useEffect(() => {
    if (!meta) {
      getPluginSrv().loadMeta(pluginId).then(
        (m) => {
          dispatchMeta({
            type: types.UPDATE_META,
            payload: m
          })
        }
      )
    }
  }, [meta, pluginId])

  // Get whole plugin by PluginMeta
  React.useEffect(() => {
    if (!meta) {
      return
    }
    importAppPagePlugin(meta)
      .then((pageApp) => {
        setApp(pageApp);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [meta]);

  if (!meta || !app || !app.configPages || !app.configPages.body) {
    return (
      <div>
        <Translation>No config app page component found</Translation>
      </div>
    )
  }

  // const meta = app.meta
  const { Col, Row } = Grid

  const isEnabled = meta.enabled
  const isInstalled = !!meta.info

  const saveSetting = () => {
    dispatch({
      type: 'plugins/setPlugin',
      payload: {
        id: pluginId,
        jsonData: meta.jsonSetting,
        secureJsonData: meta.secureJsonData,
      },
      callback: () => {
        Message.success('Setting saved')
      }
    })
  }

  const saveAndEnable = () => {
    dispatch({
      type: 'plugins/enablePlugin',
      payload: {
        id: pluginId,
        jsonData: meta.jsonSetting,
        secureJsonData: meta.secureJsonData,
      },
      callback: () => {
        meta.enabled = true
        Message.success('Plugin enabled')
      }
    });
  }

  const disablePlugin = (id: string) => {
    dispatch({
      type: 'plugins/disablePlugin',
      payload: { id },
      callback: () => {
        meta.enabled = false
        Message.success('Plugin disabled')
      }
    });
  }
  const uninstallPlugin = (id: string) => {
    dispatch({
      type: 'plugins/uninstallPlugin',
      payload: { id },
      callback: () => {
        const history = locationService.getHistory()
        history.push('/plugins')
      }
    });
  }

  const handleGotoPlugins = () => {
    const history = locationService.getHistory()
    history.push('/manage/plugins')
  }
  const AppConfigPage = app.configPages.body

  return (
    <Box>
      <Loading visible={loading.models.plugins ?? false} fullScreen={true} />
      <Box className={'container'}>
        <Box className={'page-header'} direction={'row'} spacing={12}>
        <span className={'page-header-logo'}>
          {renderIcon(meta.id, meta.info?.logos.large, "80px")}
        </span>
          <Box direction={'column'}>
            <h1 className={'page-header-title'}>{
              <>
                <a onClick={handleGotoPlugins}>Plugins</a> / {meta.name}
              </>
            }</h1>

            <h4 className={'font-size-14'}>{meta.info.description ?? "No descriptions"}</h4>
          </Box>
          <Box style={{ marginLeft: 'auto' }} align={'flex-end'} direction={'row'} justify={'flex-end'}>
            <Box justify={"space-between"} style={{ height: '100%' }}>
              <Row className={'basic-info font-size-16'} justify={'end'}>
                <Col>
                  <div className={'info-item-title'}>Version</div>
                  <div>{meta.info.version}</div>
                </Col>
                <Col>
                  <Divider direction="ver" style={{ height: '100%' }} />
                </Col>
                <Col>
                  <Box direction={'column'}>
                    <div className={'info-item-title'}>Author</div>
                    <div>{meta.info.author?.name ?? "Unknown"}</div>
                  </Box>
                </Col>
                <Col>
                  <Divider direction="ver" style={{ height: '100%' }} />
                </Col>
                <Col className={'info-item'}>
                  <div className={'info-item-title'}>Status</div>
                  <div>{
                    meta.enabled ? <Translation className={'status-enabled'}>Enabled</Translation> :
                      <Translation className={'status-disabled'}>Disabled</Translation>
                  }</div>
                </Col>
              </Row>
              <Box direction={'row'} justify={"flex-end"} spacing={8}>
                {
                  isInstalled &&
                    <Button disabled={meta?.addon === undefined} warning={true}
                            onClick={() => uninstallPlugin(pluginId)}>Uninstall</Button>
                }
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box className={'container'}>
        <Tab>
          <Tab.Item title={'Config'}>
            <Box style={{ backgroundColor: '#FFF', padding: '0 10px' }}>
              <AppConfigPage plugin={app} query={{}} onJSONDataChange={handleJSONChange}
                             onSecureJSONDataChange={handleSecureJSONChange} />
              <Box direction={"row"} justify={'center'} spacing={10} margin={20}>
                {!isEnabled &&
                    <Button type={'normal'} onClick={saveSetting}>Save</Button>
                }
                {!isEnabled &&
                    <Button type={'primary'} onClick={saveAndEnable}>Save & Enable</Button>
                }
                {isEnabled &&
                    <Button type={'primary'} onClick={saveSetting}>Save</Button>
                }
                {isEnabled &&
                    <Button type={'normal'} warning={true} onClick={() => disablePlugin(pluginId)}>Disable</Button>
                }
              </Box>
            </Box>
          </Tab.Item>
        </Tab>
      </Box>

    </Box>
  )
}

async function loadAppPlugin(
  pluginId: string,
  setApp: React.Dispatch<React.SetStateAction<AppPagePlugin | undefined>>
) {
  try {
    const app = await getPluginSrv().loadMeta(pluginId);
    if (app && 'type' in app) {
      return importAppPagePlugin(app)
        .then((pageApp) => {
          setApp(pageApp);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  } catch (err) {
    console.log(err)
  }
}

const mapStateToProps = (store: any) => ({
  ...store.plugins, loading: store.loading
})

export const AppConfigPage = connect(mapStateToProps)(ConfigPage)
export const AppRootPage = connect(mapStateToProps)(RootPage)
export const DefinitinPluginRoot = React.forwardRef(RootPage);
