import type { Rule } from '@alifd/field';
import { Grid, Field, Form, Message, Button, Input, Select, Card, Loading } from '@alifd/next';
import { connect } from 'dva';
import { Link } from 'dva/router';
import _ from 'lodash';
import React from 'react';

import {
  createApplicationComponent,
  updateComponentProperties,
  getApplicationComponent,
} from '../../../../api/application';
import { detailComponentDefinition } from '../../../../api/definitions';
import DrawerWithFooter from '../../../../components/Drawer';
import { Translation } from '../../../../components/Translation';
import UISchema from '../../../../components/UISchema';
import i18n from '../../../../i18n';
import type {
  DefinitionDetail,
  Trait,
  ApplicationComponent,
  ApplicationComponentConfig,
  ApplicationComponentBase,
} from '@velaux/data';
import { checkName } from '../../../../utils/common';
import { locale } from '../../../../utils/locale';
import { transComponentDefinitions } from '../../../../utils/utils';

import { DefinitinPluginRoot } from '../../../../layout/AppRootPage';
import { PluginMeta, PluginType } from '@velaux/data';
import { getPluginSrv } from '../../../../services/PluginService';

import './index.less';

import Permission from '../../../../components/Permission';
import { If } from '../../../../components/If';
import { BiCodeBlock, BiLaptop } from 'react-icons/bi';

type Props = {
  appName?: string;
  project: string;
  componentName?: string;
  isEditComponent: boolean;
  temporaryTraitList: Trait[];
  componentDefinitions: [];
  components: ApplicationComponentBase[];
  onComponentOK: () => void;
  onComponentClose: () => void;
  dispatch?: any;
};

type State = {
  definitionDetail?: DefinitionDetail;
  isCreateComponentLoading: boolean;
  isUpdateComponentLoading: boolean;
  editComponent?: ApplicationComponent;
  loading: boolean;
  propertiesMode: string;
  plugins: PluginMeta[];
};

@connect()
class ComponentDialog extends React.Component<Props, State> {
  field: Field;
  uiSchemaRef: React.RefObject<UISchema>;
  constructor(props: Props) {
    super(props);
    this.field = new Field(this);
    this.state = {
      isCreateComponentLoading: false,
      isUpdateComponentLoading: false,
      loading: true,
      propertiesMode: 'native',
      plugins: []
    };
    this.uiSchemaRef = React.createRef();
  }

  componentDidMount() {
    const { isEditComponent, dispatch, appName, project } = this.props;
    if (isEditComponent) {
      this.onGetEditComponentInfo(() => {
        if (this.state.editComponent) {
          const { name, alias, type, description, properties, dependsOn } = this.state.editComponent;
          this.field.setValues({
            name,
            alias,
            componentType: type,
            description,
            properties,
            dependsOn,
          });
          if (type) {
            this.onDetailsComponentDefinition(type);
          }
        }
      });
    } else {
      const getInitComponentType: string = this.field.getValue('componentType') || '';
      this.onDetailsComponentDefinition(getInitComponentType);
    }
    dispatch({
      type: 'uischema/setAppName',
      payload: appName,
    });
    dispatch({
      type: 'uischema/setProject',
      payload: project,
    });
  }

  loadDefinitionPlugins = () => {
    return getPluginSrv()
      .listAppPagePlugins(PluginType.Definition)
      .then((plugins) => {
        this.setState({
          plugins: plugins
        });
      });
  };

  onGetEditComponentInfo(callback?: () => void) {
    const { appName, componentName } = this.props;
    this.setState({ loading: true });
    if (appName && componentName) {
      getApplicationComponent(appName, componentName).then((res: ApplicationComponent) => {
        if (res) {
          this.setState(
            {
              editComponent: res,
              loading: false,
            },
            callback
          );
        }
      });
    }
  }

  onClose = () => {
    this.props.onComponentClose();
  };

  onSubmitCreate = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      const { appName = '', temporaryTraitList = [] } = this.props;
      const { name, alias = '', description = '', componentType = '', properties, dependsOn = [] } = values;
      const params: ApplicationComponentConfig = {
        name,
        alias,
        description,
        componentType,
        properties: JSON.stringify(properties),
      };

      const traitLists = _.cloneDeep(temporaryTraitList);
      traitLists.forEach((item) => {
        if (item.properties) {
          item.properties = JSON.stringify(item.properties);
        }
      });
      params.name = `${appName}-${name}`;
      params.componentType = componentType;
      params.traits = traitLists;
      params.dependsOn = dependsOn;
      this.setState({ isCreateComponentLoading: true });
      createApplicationComponent(params, { appName }).then((res) => {
        if (res) {
          Message.success({
            duration: 4000,
            content: i18n.t('Component created successfully').toString(),
          });
          this.props.onComponentOK();
        }
        this.setState({ isCreateComponentLoading: false });
      });
    });
  };

  onDetailsComponentDefinition = (value: string, callback?: () => void) => {
    detailComponentDefinition({ name: value })
      .then((re) => {
        if (re) {
          this.setState({ definitionDetail: re, loading: false });
          if (callback) {
            callback();
          }
        }
      })
      .catch();
  };

  extButtonList = () => {
    const { onComponentClose, isEditComponent, project, componentName, appName } = this.props;
    const { isCreateComponentLoading, isUpdateComponentLoading } = this.state;
    return (
      <div className="footer-actions">
        <Button type="secondary" onClick={onComponentClose} className="margin-right-10">
          {i18n.t('Cancel').toString()}
        </Button>
        <If condition={!isEditComponent}>
          <Permission
            request={{
              resource: `project:${project}/application:${appName}/component:*`,
              action: 'create',
            }}
            project={project}
          >
            <Button type="primary" onClick={this.onSubmitCreate} loading={isCreateComponentLoading}>
              {i18n.t('Create').toString()}
            </Button>
          </Permission>
        </If>
        <If condition={isEditComponent}>
          <Permission
            request={{
              resource: `project:${project}/application:${appName}/component:${componentName || '*'}`,
              action: 'update',
            }}
            project={project}
          >
            <Button type="primary" onClick={this.onSubmitEditComponent} loading={isUpdateComponentLoading}>
              {i18n.t('Update').toString()}
            </Button>
          </Permission>
        </If>
      </div>
    );
  };

  showComponentTitle = () => {
    const { isEditComponent } = this.props;
    const { editComponent } = this.state;
    if (isEditComponent && editComponent) {
      const { name = '', alias = '' } = editComponent;
      return (
        <div>
          <span>{alias ? `${alias}(${name})` : name}</span>
        </div>
      );
    } else {
      return (
        <div>
          <span>{i18n.t('New Component')} </span>
        </div>
      );
    }
  };

  getInitName = () => {
    const { isEditComponent, appName } = this.props;
    if (isEditComponent && appName) {
      return '';
    } else {
      return `${appName}-`;
    }
  };

  getTraitList = () => {
    const { editComponent } = this.state;
    const { isEditComponent, temporaryTraitList } = this.props;
    if (isEditComponent && editComponent) {
      return [...(editComponent.traits || [])];
    } else {
      return [...temporaryTraitList];
    }
  };

  onSubmitEditComponent = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      const { appName = '', componentName = '' } = this.props;
      const { name, alias = '', description = '', componentType = '', properties, dependsOn = [] } = values;
      const params: ApplicationComponentConfig = {
        name,
        alias,
        description,
        componentType,
        properties: JSON.stringify(properties),
        dependsOn,
      };
      this.setState({ isUpdateComponentLoading: true });
      updateComponentProperties(params, { appName, componentName }).then((res) => {
        if (res) {
          Message.success({
            duration: 4000,
            content: i18n.t('Component updated successfully').toString(),
          });
          this.props.onComponentOK();
        }
        this.setState({ isUpdateComponentLoading: false });
      });
    });
  };

  removeProperties = () => {
    this.field.remove('properties');
    this.setState({ definitionDetail: undefined });
  };

  getDependsOptions = () => {
    const { components, componentName } = this.props;
    const filterComponents = (components || []).filter((component) => {
      if (
        componentName &&
        (component.name === componentName || (component.dependsOn && component.dependsOn.includes(componentName)))
      ) {
        return false;
      } else {
        return true;
      }
    });
    const componentOptions = filterComponents?.map((component) => {
      return {
        label: component.alias ? `${component.alias}(${component.name})` : component.name,
        value: component.name,
      };
    });
    return componentOptions || [];
  };

  render() {
    const init = this.field.init;
    const FormItem = Form.Item;
    const { Row, Col } = Grid;
    const { isEditComponent, componentDefinitions, onComponentClose, project } = this.props;
    const { definitionDetail, loading, propertiesMode, plugins } = this.state;
    const validator = (rule: Rule, value: any, callback: (error?: string) => void) => {
      this.uiSchemaRef.current?.validate(callback);
    };

    const componentType: string = this.field.getValue('componentType') || '';
    const plugin = plugins.find(o => o?.position === "definition.component." + componentType);
    const usePlugin = componentType && plugin;

    return (
      <DrawerWithFooter
        title={this.showComponentTitle()}
        placement="right"
        width={800}
        onClose={onComponentClose}
        extButtons={this.extButtonList()}
      >
        <Form field={this.field} className="basic-config-wrapper">
          <Loading visible={loading} style={{ width: '100%' }}>
            <Card contentHeight={'auto'} title="Basic Configuration">
              <Row>
                <Col span={12} style={{ paddingRight: '8px' }}>
                  <FormItem
                    label={<Translation className="font-size-14 font-weight-bold color333">Name</Translation>}
                    labelTextAlign="left"
                    required={true}
                  >
                    <Input
                      name="name"
                      maxLength={32}
                      disabled={isEditComponent ? true : false}
                      addonTextBefore={this.getInitName()}
                      {...init('name', {
                        rules: [
                          {
                            required: true,
                            pattern: checkName,
                            message: 'Please enter a valid application name',
                          },
                        ],
                      })}
                    />
                  </FormItem>
                </Col>

                <Col span={12} style={{ paddingLeft: '8px' }}>
                  <FormItem label={<Translation>Alias</Translation>}>
                    <Input
                      name="alias"
                      placeholder={i18n.t('Please enter').toString()}
                      {...init('alias', {
                        rules: [
                          {
                            minLength: 2,
                            maxLength: 64,
                            message: 'Enter a string of 2 to 64 characters.',
                          },
                        ],
                      })}
                    />
                  </FormItem>
                </Col>
              </Row>
              <Row>
                <Col span={24}>
                  <FormItem label={<Translation>Description</Translation>}>
                    <Input
                      name="description"
                      placeholder={i18n.t('Please enter').toString()}
                      {...init('description', {
                        rules: [
                          {
                            maxLength: 256,
                            message: 'Enter a description that contains less than 256 characters.',
                          },
                        ],
                      })}
                    />
                  </FormItem>
                </Col>
              </Row>
              <Row>
                <Col span={12} style={{ paddingRight: '8px' }}>
                  <FormItem
                    label={<Translation className="font-size-14 font-weight-bold color333">Type</Translation>}
                    required={true}
                    help={
                      <span>
                        <Translation>Get more component type?</Translation>
                        <Link to="/addons">
                          <Translation>Go to enable addon</Translation>
                        </Link>
                      </span>
                    }
                  >
                    <Select
                      locale={locale().Select}
                      showSearch
                      disabled={isEditComponent ? true : false}
                      className="select"
                      {...init(`componentType`, {
                        initValue: isEditComponent ? '' : 'webservice',
                        rules: [
                          {
                            required: true,
                            message: i18n.t('Please select'),
                          },
                        ],
                      })}
                      dataSource={transComponentDefinitions(componentDefinitions)}
                      onChange={(item: string) => {
                        this.removeProperties();
                        this.field.setValue('componentType', item);
                        this.onDetailsComponentDefinition(item);
                      }}
                    />
                  </FormItem>
                </Col>

                <Col span={12} style={{ paddingRight: '8px' }}>
                  <FormItem
                    label={<Translation className="font-size-14 font-weight-bold color333">Depends On</Translation>}
                  >
                    <Select
                      {...init(`dependsOn`, {
                        rules: [
                          {
                            required: false,
                            message: i18n.t('Please select'),
                          },
                        ],
                      })}
                      locale={locale().Select}
                      mode="multiple"
                      dataSource={this.getDependsOptions()}
                    />
                  </FormItem>
                </Col>
              </Row>
            </Card>
          </Loading>
          <Card
            contentHeight={'auto'}
            className="withActions"
            title="Deployment Properties"
            subTitle={
              definitionDetail && definitionDetail.uiSchema
                ? [
                  <Button
                    style={{ alignItems: 'center', display: 'flex' }}
                    onClick={() => {
                      if (propertiesMode === 'native') {
                        this.setState({ propertiesMode: 'code' });
                      } else {
                        this.setState({ propertiesMode: 'native' });
                      }
                    }}
                  >
                    {propertiesMode === 'native' && (
                      <BiCodeBlock size={14} title={i18n.t('Switch to the coding mode')} />
                    )}
                    {propertiesMode === 'code' && <BiLaptop size={14} title={i18n.t('Switch to the native mode')} />}
                  </Button>,
                ]
                : []
            }
          >
            <Row>
              <If condition={!usePlugin && definitionDetail}>
                <UISchema
                  {...init(`properties`, {
                    rules: [
                      {
                        validator: validator,
                        message: i18n.t('Please check the component properties'),
                      },
                    ],
                  })}
                  enableCodeEdit={propertiesMode === 'code'}
                  uiSchema={definitionDetail && definitionDetail.uiSchema}
                  definition={{
                    name: definitionDetail?.name || '',
                    type: 'component',
                    description: definitionDetail?.description || '',
                  }}
                  ref={this.uiSchemaRef}
                  mode={isEditComponent ? 'edit' : 'new'}
                />
              </If>
              <If condition={usePlugin}>
                <DefinitinPluginRoot
                  pluginId={plugin ? plugin.id : ""}
                  project={project}
                  {...init(`properties`, {
                    rules: [
                      {
                        validator: validator,
                        message: i18n.t('Please check the component properties'),
                      },
                    ],
                  })}
                  ref={this.uiSchemaRef} />
              </If>
            </Row>
          </Card>
        </Form>
      </DrawerWithFooter>
    );
  }
}

export default ComponentDialog;
