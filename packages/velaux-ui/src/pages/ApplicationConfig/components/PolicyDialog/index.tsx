import { Card, Form, Grid, Message, Button, Select, Input, Field, Loading } from '@alifd/next';
import React from 'react';
import {
  AiOutlineFileDone,
  AiOutlineGroup,
  AiOutlineHdd,
  AiOutlineMergeCells,
  AiOutlineOneToOne,
  AiOutlineReconciliation,
} from 'react-icons/ai';

import { createPolicy, updatePolicy } from '../../../../api/application';
import { detailPolicyDefinition, getPolicyDefinitions } from '../../../../api/definitions';
import DrawerWithFooter from '../../../../components/Drawer';
import { If } from '../../../../components/If';
import Permission from '../../../../components/Permission';
import { Translation } from '../../../../components/Translation';
import i18n from '../../../../i18n';
import type {
  ApplicationPolicyDetail,
  CreatePolicyRequest,
  DefinitionDetail,
  EnvBinding,
  UpdatePolicyRequest,
  Workflow,
  DefinitionBase
} from '@velaux/data';

import './index.less';
import classNames from 'classnames';

import { checkName } from '../../../../utils/common';
import { locale } from '../../../../utils/locale';
import UISchema from '../../../../components/UISchema';
import { PluginMeta, PluginType } from '@velaux/data';
import { getPluginSrv } from '../../../../services/PluginService';
import { DefinitinPluginRoot } from '../../../../layout/AppRootPage';

import type { Rule } from '@alifd/next/lib/field';
import { connect } from 'dva';
import { BiCodeBlock, BiLaptop } from 'react-icons/bi';

const { Row, Col } = Grid;

type Props = {
  visible: boolean;
  appName: string;
  project: string;
  workflows: Workflow[];
  envbinding: EnvBinding[];
  policy?: ApplicationPolicyDetail;
  onClose: () => void;
  onOK: () => void;
  dispatch?: ({ }) => {};
};

type PolicyItem = {
  icon: React.ReactNode;
  label: string;
  name: string;
  title?: string;
  type: string;
  properties?: any;
};

type State = {
  items: PolicyItem[];
  selectedPolicyItem?: PolicyItem;
  policyDefinitionDetail?: DefinitionDetail;
  createPolicyLoading: boolean;
  definitionDetailLoading: boolean;
  definitions?: DefinitionBase[];
  propertiesMode: 'native' | 'code';
  plugins: PluginMeta[];
};

@connect()
class PolicyDialog extends React.Component<Props, State> {
  field: Field;
  uiSchemaRef: React.RefObject<UISchema>;
  constructor(props: Props) {
    super(props);
    this.state = {
      items: [
        {
          label: i18n.t('Override'),
          type: 'override',
          name: 'override-custom',
          icon: <AiOutlineMergeCells size={35} />,
          title: i18n.t('Set differentiated configurations of the application in different environments.'),
        },
        {
          label: i18n.t('Topology'),
          type: 'topology',
          name: 'topology',
          icon: <AiOutlineGroup size={35} />,
          title: i18n.t('This policy allows custom the topology by the target'),
        },
        {
          label: i18n.t('Deliver Once'),
          type: 'apply-once',
          name: 'apply-once-no-rule',
          icon: <AiOutlineOneToOne size={35} />,
          title: i18n.t(
            "This policy allows direct changes to the resources distributed to the target cluster, the controller won't keep reconciling."
          ),
          properties: {
            enable: true,
          },
        },
        {
          label: i18n.t('PVC Retain'),
          type: 'garbage-collect',
          name: 'garbage-collect-retain-pvc',
          icon: <AiOutlineHdd size={35} />,
          title: i18n.t('This policy allows retaining the PVC resource after recycling the application.'),
          properties: {
            rules: [
              {
                selector: {
                  resourceTypes: ['PersistentVolumeClaim'],
                },
                strategy: 'never',
              },
            ],
          },
        },
        {
          label: i18n.t('Replicas Scalable'),
          type: 'apply-once',
          name: 'apply-once-ignore-replicas',
          icon: <AiOutlineReconciliation size={35} />,
          title: i18n.t('This policy allows replicas of workloads to be changed, such as working with HPA.'),
          properties: {
            rules: [
              {
                enable: true,
                rules: [
                  {
                    selector: {
                      resourceTypes: ['Deployment', 'StatefulSet', 'Job'],
                    },
                    strategy: {
                      path: ['spec.replicas'],
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          label: i18n.t('Custom'),
          name: 'custom',
          type: '',
          icon: <AiOutlineFileDone size={35} />,
        },
      ],
      createPolicyLoading: false,
      definitionDetailLoading: false,
      propertiesMode: 'native',
      plugins: []
    };
    this.field = new Field(this, {
      onChange: (name: string, value: any) => {
        if (name === 'type') {
          this.handleTypeChange(value);
        }
      },
    });
    this.uiSchemaRef = React.createRef();
  }

  componentDidMount() {
    this.setUISchemaContext();
    const { policy } = this.props;
    this.loadDefinitionPlugins();
    if (policy) {
      let selected = false;
      this.state.items.map((item) => {
        if (item.type == policy.type && item.properties == undefined) {
          this.onSelectPolicy(item);
          selected = true;
        }
      });
      if (!selected) {
        this.onSelectPolicy({
          label: i18n.t('Custom'),
          name: 'custom',
          type: '',
          icon: <AiOutlineFileDone size={35} />,
        });
      }
      this.field.setValues({ ...policy });
      if (Array.isArray(policy.workflowPolicyBind) && policy.workflowPolicyBind.length > 0) {
        this.field.setValues({
          workflow: policy.workflowPolicyBind[0].name,
          steps: policy.workflowPolicyBind[0].steps,
        });
      }
      this.loadPolicyDefinitionDetail(policy.type);
    }
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

  handleTypeChange = (value: string) => {
    this.removeProperties(() => {
      this.loadPolicyDefinitionDetail(value);
      this.field.setValue('name', value);
      this.field.setValue('alias', value);
    });
  };

  removeProperties = (callback: () => void) => {
    this.field.remove('properties');
    this.setState({ policyDefinitionDetail: undefined }, callback);
  };

  setUISchemaContext = () => {
    const { dispatch, appName, project } = this.props;
    if (dispatch) {
      dispatch({
        type: 'uischema/setAppName',
        payload: appName,
      });
      dispatch({
        type: 'uischema/setProject',
        payload: project,
      });
    }
  };

  extButtonList = () => {
    const { appName, project, policy } = this.props;
    const { createPolicyLoading, selectedPolicyItem } = this.state;
    return (
      <div>
        <Permission
          request={{
            resource: `project:${project}/application:${appName}/policy:*`,
            action: 'create',
          }}
          project={project}
        >
          <If condition={!policy}>
            <Button
              disabled={!selectedPolicyItem}
              type="primary"
              onClick={this.onSubmitCreate}
              loading={createPolicyLoading}
            >
              {i18n.t('Create').toString()}
            </Button>
          </If>
          <If condition={policy}>
            <Button
              disabled={!selectedPolicyItem}
              type="primary"
              onClick={this.onSubmitUpdate}
              loading={createPolicyLoading}
            >
              {i18n.t('Update').toString()}
            </Button>
          </If>
        </Permission>
      </div>
    );
  };

  onSubmitCreate = () => {
    const { selectedPolicyItem } = this.state;
    if (!selectedPolicyItem) {
      return;
    }
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      this.setState({ createPolicyLoading: true });
      const { appName } = this.props;
      if (!appName) {
        return;
      }
      const { properties, name, alias, description, envName, type, workflow, steps } = values;
      let policyType = selectedPolicyItem.type;
      if (type) {
        policyType = type;
      }
      if (!policyType) {
        Message.warning(i18n.t('Please select a policy type first.'));
        return;
      }
      let env = envName;
      if (!env && workflow) {
        env = this.getEnvNameFromWorkflow(workflow);
      }
      const params: CreatePolicyRequest = {
        name: name,
        type: policyType,
        envName: env,
        description: description,
        alias: alias,
        properties: JSON.stringify(properties),
      };
      if (workflow && steps && steps.length > 0) {
        params.workflowPolicyBind = [
          {
            name: workflow,
            steps: steps,
          },
        ];
      }
      createPolicy(appName, params)
        .then((res) => {
          if (res) {
            Message.success(i18n.t('Policy added successfully'));
            this.props.onOK();
          }
        })
        .finally(() => {
          this.setState({ createPolicyLoading: false });
        });
    });
  };

  onSubmitUpdate = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      this.setState({ createPolicyLoading: true });
      const { appName } = this.props;
      if (!appName) {
        return;
      }
      const { properties, name, alias, description, envName, type, workflow, steps } = values;
      let env = envName;
      if (!env && workflow) {
        env = this.getEnvNameFromWorkflow(workflow);
      }
      const params: UpdatePolicyRequest = {
        envName: env,
        description: description,
        alias: alias,
        type: type,
        properties: JSON.stringify(properties),
      };
      if (workflow && steps && steps.length > 0) {
        params.workflowPolicyBind = [
          {
            name: workflow,
            steps: steps,
          },
        ];
      }
      updatePolicy(appName, name, params)
        .then((res) => {
          if (res) {
            Message.success(i18n.t('Policy updated successfully'));
            this.props.onOK();
          }
        })
        .finally(() => {
          this.setState({ createPolicyLoading: false });
        });
    });
  };

  onSelectPolicy = (item: PolicyItem) => {
    this.field.reset();
    this.field.setValues({
      name: item.name,
      description: item.title,
      properties: item.properties,
      type: item.type,
      alias: item.label,
    });
    if (item.name == 'custom') {
      this.loadPolicyDefinitions();
    }
    if (!item.properties) {
      this.loadPolicyDefinitionDetail(item.type);
    }
    this.setState({ selectedPolicyItem: item });
  };

  buildEnvironmentOptions = () => {
    const { envbinding } = this.props;
    return envbinding?.map((env) => {
      return {
        label: env.alias,
        value: env.name,
      };
    });
  };

  buildWorkflowStepsOptions = () => {
    const workflowName: string = this.field.getValue('workflow');
    const { workflows } = this.props;
    const stepOptions: { label: string; value: string }[] = [];
    workflows.map((wf) => {
      if (wf.name == workflowName) {
        wf.steps?.map((step) => {
          if (step.type == 'deploy') {
            stepOptions.push({
              label: `${step.name}(${step.alias || '-'})`,
              value: step.name,
            });
          }
        });
      }
    });
    return stepOptions;
  };

  buildWorkflowOptions = () => {
    const { workflows } = this.props;
    return workflows.map((wf) => {
      return {
        label: `${wf.name}(${wf.alias || '-'})`,
        value: wf.name,
      };
    });
  };

  buildPolicyTypeOptions = () => {
    const { definitions } = this.state;
    const options: { label: string; value: string }[] = [];
    definitions?.map((definition) => {
      if (definition.name != 'override' && definition.name != 'topology') {
        options.push({
          label: definition.name,
          value: definition.name,
        });
      }
    });
    return options;
  };

  getEnvNameFromWorkflow = (workflowName: string) => {
    const { workflows } = this.props;
    let envName = '';
    workflows.map((wf) => {
      if (wf.name == workflowName) {
        envName = wf.envName;
      }
    });
    return envName;
  };

  loadPolicyDefinitions = () => {
    getPolicyDefinitions().then((res) => {
      this.setState({ definitions: res.definitions });
    });
  };

  loadPolicyDefinitionDetail = (policyType: string) => {
    this.setState({ definitionDetailLoading: true });
    detailPolicyDefinition({ name: policyType })
      .then((res) => {
        if (res) {
          this.setState({ policyDefinitionDetail: res });
        }
      })
      .finally(() => {
        this.setState({ definitionDetailLoading: false });
      });
  };

  render() {
    const { onClose, policy, project } = this.props;
    const { items, selectedPolicyItem, plugins, definitionDetailLoading, policyDefinitionDetail, propertiesMode } = this.state;
    const validator = (rule: Rule, value: any, callback: (error?: string) => void) => {
      this.uiSchemaRef.current?.validate(callback);
    };
    const init = this.field.init;
    const showType = (selectedPolicyItem && selectedPolicyItem?.name == 'custom') || policy != undefined;
    const span = showType ? 8 : 12;

    const plugin = plugins.find(o => o?.position === "definition.policy." + selectedPolicyItem?.type);
    const usePlugin = selectedPolicyItem && plugin;

    return (
      <DrawerWithFooter
        title={policy ? i18n.t('Update Policy') : i18n.t('New Policy')}
        placement="right"
        width={800}
        onClose={onClose}
        extButtons={this.extButtonList()}
      >
        <Form field={this.field}>
          <Card contentHeight="auto" title={i18n.t('Select a policy type').toString()}>
            {!policy && (
              <Row wrap={true}>
                {items.map((item) => {
                  return (
                    <Col l={4} title={item.title} key={item.name}>
                      <div
                        className={classNames('policy-item', {
                          active: selectedPolicyItem && selectedPolicyItem.name == item.name,
                        })}
                        onClick={() => this.onSelectPolicy(item)}
                      >
                        <div className="policy-icon">{item.icon}</div>
                        <div className="policy-name">{item.label}</div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
            {selectedPolicyItem && (
              <Row wrap={true}>
                {showType && (
                  <Col span={span} style={{ padding: '0 8px' }}>
                    <Form.Item label={i18n.t('Policy Type')} required>
                      <Select
                        {...init('type', {
                          rules: [
                            {
                              required: true,
                              message: i18n.t('Please must select the policy type.').toString(),
                            },
                          ],
                        })}
                        hasClear
                        disabled={policy != undefined}
                        locale={locale().Select}
                        dataSource={this.buildPolicyTypeOptions()}
                      />
                    </Form.Item>
                  </Col>
                )}
                <Col span={span} style={{ padding: '0 8px' }}>
                  <Form.Item label={i18n.t('Name').toString()} required={true}>
                    <Input
                      {...init(`name`, {
                        rules: [
                          {
                            required: true,
                            pattern: checkName,
                            message: 'Please input a valid policy name',
                          },
                        ],
                      })}
                      disabled={policy != undefined}
                      locale={locale().Input}
                    />
                  </Form.Item>
                </Col>
                <Col span={span} style={{ padding: '0 8px' }}>
                  <Form.Item label={i18n.t('Alias').toString()}>
                    <Input
                      {...init(`alias`, {
                        rules: [
                          {
                            minLength: 2,
                            maxLength: 64,
                            message: 'Input a string of 2 to 64 characters.',
                          },
                        ],
                      })}
                      locale={locale().Input}
                    />
                  </Form.Item>
                </Col>
                <Col span={24} style={{ padding: '0 8px' }}>
                  <Form.Item label={<Translation>Description</Translation>}>
                    <Input
                      name="description"
                      placeholder={i18n.t('Please input the description').toString()}
                      {...init('description', {
                        rules: [
                          {
                            maxLength: 256,
                            message: i18n.t('Enter a description that contains less than 256 characters.'),
                          },
                        ],
                      })}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <If condition={selectedPolicyItem?.properties}>
              <Message style={{ marginTop: '8px' }} type="success">
                <Translation>This policy already have the default properties</Translation>
              </Message>
            </If>
          </Card>
          <Card contentHeight="auto" style={{ marginTop: '8px' }} title={i18n.t('Select an environment').toString()}>
            {!selectedPolicyItem ||
              (selectedPolicyItem.type != 'override' && (
                <div>
                  <Form.Item
                    help={i18n
                      .t('If select an environment, this policy is only enabled in the selected environment.')
                      .toString()}
                  >
                    <Select
                      {...init('envName', {
                        rules: [],
                      })}
                      hasClear
                      locale={locale().Select}
                      dataSource={this.buildEnvironmentOptions()}
                    />
                  </Form.Item>
                </div>
              ))}
            {selectedPolicyItem && selectedPolicyItem.type == 'override' && (
              <div>
                <Row>
                  <Col span={12} style={{ padding: '0 8px' }}>
                    <Form.Item
                      help={i18n.t('Select the workflow to which the policy should be applied.').toString()}
                      required
                      label={i18n.t('Workflow').toString()}
                    >
                      <Select
                        {...init('workflow', {
                          rules: [
                            {
                              required: true,
                            },
                          ],
                        })}
                        hasClear
                        locale={locale().Select}
                        dataSource={this.buildWorkflowOptions()}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12} style={{ padding: '0 8px' }}>
                    <Form.Item
                      help={i18n.t('Select the steps to which the policy should be applied.').toString()}
                      label={i18n.t('Steps').toString()}
                      required={true}
                    >
                      <Select
                        {...init('steps', {
                          rules: [
                            {
                              required: true,
                            },
                          ],
                        })}
                        hasClear
                        locale={locale().Select}
                        mode="multiple"
                        dataSource={this.buildWorkflowStepsOptions()}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
          {selectedPolicyItem && !selectedPolicyItem?.properties && (
            <Loading visible={definitionDetailLoading} style={{ width: '100%' }}>
              <Card
                contentHeight={'auto'}
                style={{ marginTop: '8px' }}
                title={i18n.t('Policy Properties').toString()}
                className="withActions"
                subTitle={
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
                  </Button>
                }
              >
                <Form.Item required={true}>
                  <If condition={!usePlugin}>
                    <UISchema
                      key={policyDefinitionDetail?.name}
                      {...init(`properties`, {
                        rules: [
                          {
                            validator: validator,
                            message: i18n.t('Please check the properties of this policy'),
                          },
                        ],
                      })}
                      enableCodeEdit={propertiesMode === 'code'}
                      uiSchema={policyDefinitionDetail && policyDefinitionDetail.uiSchema}
                      definition={{
                        type: 'policy',
                        name: policyDefinitionDetail?.name || '',
                        description: policyDefinitionDetail?.description || '',
                      }}
                      ref={this.uiSchemaRef}
                      mode={'new'}
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
                            message: i18n.t('Please check the properties of this policy'),
                          },
                        ],
                      })}
                      ref={this.uiSchemaRef} />
                  </If>
                </Form.Item>
                <If condition={!policyDefinitionDetail}>
                  <Message type="notice">
                    <Translation>Please select policy type first.</Translation>
                  </Message>
                </If>
              </Card>
            </Loading>
          )}
        </Form>
      </DrawerWithFooter>
    );
  }
}

export default PolicyDialog;
