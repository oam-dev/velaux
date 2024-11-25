import type { Rule } from '@alifd/field';
import { Grid, Field, Form, Input, Button } from '@alifd/next';
import _ from 'lodash';
import React, { Component } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import { detailWorkflowDefinition } from '../../api/workflows';
import { UISchemaContext, WorkflowContext } from '../../context';
import Group from '../../extends/Group';
import './index.less';
import { StepSelect } from '../../extends/StepSelect';
import i18n from '../../i18n';
import type { DefinitionDetail, WorkflowStepBase } from '@velaux/data';
import { replaceUrl } from '../../utils/common';
import DrawerWithFooter from '../Drawer';
import { If } from '../If';
import { Translation } from '../Translation';
import UISchema from '../UISchema';

import {  DefinitinPluginRoot } from '../../layout/AppRootPage';
import { PluginMeta, PluginType } from '@velaux/data';
import { getPluginSrv } from '../../services/PluginService';

import { InputItems } from './input-item';
import { OutputItems } from './output-item';
import { BiCodeBlock, BiLaptop } from 'react-icons/bi';

type Props = {
  onUpdate: (data: WorkflowStepBase) => void;
  step: WorkflowStepBase;
  isSubStep?: boolean;
  onClose: () => void;
};

type State = {
  definitionDetail?: DefinitionDetail;
  definitionLoading: boolean;
  propertiesMode: 'native' | 'code';
  plugin?: PluginMeta | null,
};

class StepForm extends Component<Props, State> {
  static contextType = WorkflowContext;
  field: Field;
  uiSchemaRef: React.RefObject<UISchema>;
  constructor(props: Props) {
    super(props);
    this.state = {
      definitionLoading: false,
      propertiesMode: 'native',
      plugin: null,
    };
    this.field = new Field(this, {
      onChange: (name: string, value: string) => {
        if (name == 'type') {
          this.field.setValue('name', value);
        }
      },
    });
    this.uiSchemaRef = React.createRef();
  }

  componentDidMount = () => {
    const { properties, type } = this.props.step;
    this.field.setValues(this.props.step);
    if (properties && typeof properties === 'string') {
      this.field.setValues({ properties: JSON.parse(properties) });
    }
    this.onDetailDefinition(type);
    this.loadDefinitionPlugins(type);
  };

  loadDefinitionPlugins = (type: string) => {
    return getPluginSrv()
      .listAppPagePlugins( PluginType.Definition)
      .then((plugins) => {
        const plugin = plugins.find(o => o?.position === "definition.workflow_step." + type);
        this.setState({
          plugin: plugin || null
        });
      });
  };

  setValues = (values: any | null) => {
    if (values) {
      const { consumerData } = values;
      this.field.setValues(consumerData);
    }
  };

  onSubmit = () => {
    this.field.validate((error, values) => {
      if (error) {
        return;
      }
      const { step } = this.props;
      this.props.onUpdate({ ...step, ...values });
    });
  };

  onDetailDefinition = (value: string, callback?: () => void) => {
    this.setState({ definitionLoading: true });
    detailWorkflowDefinition({ name: value })
      .then((re) => {
        if (re) {
          this.setState({ definitionDetail: re, definitionLoading: false });
          if (callback) {
            callback();
          }
        }
      })
      .catch(() => this.setState({ definitionLoading: false }));
  };

  handleChang = (value: string) => {
    this.removeProperties();
    this.field.setValues({ type: value });
    this.onDetailDefinition(value);
  };

  removeProperties = () => {
    this.field.remove('properties');
    this.setState({ definitionDetail: undefined });
  };

  render() {
    const { init } = this.field;
    const { Row, Col } = Grid;
    const FormItem = Form.Item;
    const { onClose, isSubStep } = this.props;
    const { definitionDetail, propertiesMode, plugin } = this.state;
    const validator = (rule: Rule, value: any, callback: (error?: string) => void) => {
      this.uiSchemaRef.current?.validate(callback);
    };

    const { workflow } = this.context;
    const mode = isSubStep ? workflow.subMode : workflow.mode;

    const groupStep = this.field.getValue('type') == 'step-group';



    return (
      <DrawerWithFooter
        title={<Translation>{'Edit Step'}</Translation>}
        placement="right"
        width={800}
        onClose={onClose}
        onOk={this.onSubmit}
        extButtons={[
          <Button key={'cancel'} style={{ marginRight: '16px' }} onClick={onClose}>
            <Translation>Cancel</Translation>
          </Button>,
        ]}
      >
        <Form field={this.field}>
          {!groupStep && (
            <Row>
              <Col span={24}>
                <Group
                  title="Properties"
                  description="Set the configuration parameters for the Workflow or Pipeline step."
                  closed={false}
                  required={true}
                  hasToggleIcon={true}
                >
                  <If condition={definitionDetail && !plugin}>
                    <FormItem required={true}>
                      <If condition={definitionDetail && definitionDetail.uiSchema}>
                        <div className="flexright">
                          <Button
                            style={{ marginTop: '-12px', alignItems: 'center', display: 'flex' }}
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
                            {propertiesMode === 'code' && (
                              <BiLaptop size={14} title={i18n.t('Switch to the native mode')} />
                            )}
                          </Button>
                        </div>
                      </If>
                      <UISchemaContext.Provider value={this.context}>
                        <UISchema
                          {...init(`properties`, {
                            rules: [
                              {
                                validator: validator,
                                message: i18n.t('Please check the properties of the workflow step'),
                              },
                            ],
                          })}
                          enableCodeEdit={propertiesMode === 'code'}
                          uiSchema={definitionDetail && definitionDetail.uiSchema}
                          definition={{
                            type: 'workflowstep',
                            name: definitionDetail?.name || '',
                            description: definitionDetail?.description || '',
                          }}
                          ref={this.uiSchemaRef}
                          mode={'edit'}
                        />
                      </UISchemaContext.Provider>
                    </FormItem>
                  </If>
                  <If condition={plugin}>
                    <DefinitinPluginRoot
                      pluginId={plugin ? plugin?.id : ""}
                      {...init(`properties`, {
                        rules: [
                          {
                            validator: validator,
                            message: i18n.t('Please check the properties of this workflow step'),
                          },
                        ],
                      })}
                      ref={this.uiSchemaRef} />
                  </If>
                </Group>
              </Col>
            </Row>
          )}
          <Group
            title={i18n.t('Advanced Configs')}
            description={i18n.t('Configure the inputs, outputs, timeout, and dependsOn, etc fields for the step.')}
            initClose={true}
            hasToggleIcon
            required
          >
            {mode === 'DAG' && (
              <Row>
                <Col span={24} style={{ padding: '0 8px' }}>
                  <Form.Item label={<Translation>DependsOn</Translation>}>
                    <StepSelect disabled={false} {...init('dependsOn')} />
                  </Form.Item>
                </Col>
              </Row>
            )}
            <Row wrap>
              <Col span={24} style={{ padding: '0 8px' }}>
                <FormItem
                  label={<Translation>If</Translation>}
                  help={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: replaceUrl('Reference: http://kubevela.net/docs/end-user/workflow/if-condition'),
                      }}
                    />
                  }
                >
                  <Input
                    name="if"
                    {...init('if', {
                      rules: [],
                    })}
                  />
                </FormItem>
              </Col>

              {!groupStep && (
                <Col span={24} style={{ padding: '0 8px' }}>
                  <FormItem
                    label={<Translation>Inputs</Translation>}
                    help={
                      <div
                        dangerouslySetInnerHTML={{
                          __html: replaceUrl('Reference: http://kubevela.net/docs/end-user/workflow/inputs-outputs'),
                        }}
                      />
                    }
                  >
                    <InputItems {...init('inputs')} />
                  </FormItem>
                </Col>
              )}
              {!groupStep && (
                <Col span={24} style={{ padding: '0 8px' }}>
                  <FormItem
                    label={<Translation>Outputs</Translation>}
                    help={
                      <div
                        dangerouslySetInnerHTML={{
                          __html: replaceUrl('Reference: http://kubevela.net/docs/end-user/workflow/inputs-outputs'),
                        }}
                      />
                    }
                  >
                    <OutputItems {...init('outputs')} />
                  </FormItem>
                </Col>
              )}
            </Row>

            <Row>
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Timeout</Translation>}>
                  <Input
                    name="timeout"
                    {...init('timeout', {
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
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Alias</Translation>}>
                  <Input
                    name="alias"
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

            <Row wrap>
              <Col span={24} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Description</Translation>}>
                  <Input
                    name="description"
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
          </Group>
        </Form>
      </DrawerWithFooter>
    );
  }
}

StepForm.contextType = WorkflowContext;

export default StepForm;
