import type { Rule } from '@alifd/field';
import { Grid, Field, Form, Select, Message, Button, Input, Icon, Card, Loading } from '@alifd/next';
import { connect } from 'dva';
import { Link } from 'dva/router';
import React from 'react';
import { BiCodeBlock, BiLaptop } from 'react-icons/bi';

import { updateTrait, createTrait, getApplicationComponent } from '../../../../api/application';
import { detailTraitDefinition, getTraitDefinitions } from '../../../../api/definitions';
import DrawerWithFooter from '../../../../components/Drawer';
import { If } from '../../../../components/If';
import { Translation } from '../../../../components/Translation';
import UISchema from '../../../../components/UISchema';
import i18n from '../../../../i18n';
import type { ApplicationComponent, DefinitionDetail, Trait , DefinitionBase } from '@velaux/data';

type Props = {
  project: string;
  isEditComponent: boolean;
  isEditTrait: boolean;
  visible: boolean;
  traitItem?: Trait;
  appName?: string;
  componentName?: string;
  temporaryTraitList: Trait[];
  createTemporaryTrait: (trait: Trait) => void;
  upDateTemporaryTrait: (trait: Trait) => void;
  onOK: () => void;
  onClose: () => void;
  dispatch?: any;
};

type State = {
  definitionDetail?: DefinitionDetail;
  definitionLoading: boolean;
  isLoading: boolean;
  traitDefinitions?: DefinitionBase[];
  podDisruptive?: any;
  component?: ApplicationComponent;
  propertiesMode: 'native' | 'code';
};
@connect()
class TraitDialog extends React.Component<Props, State> {
  field: Field;
  uiSchemaRef: React.RefObject<UISchema>;
  constructor(props: Props) {
    super(props);
    this.state = {
      definitionLoading: false,
      isLoading: false,
      traitDefinitions: [],
      propertiesMode: 'native',
    };
    this.field = new Field(this);
    this.uiSchemaRef = React.createRef();
  }

  componentDidMount() {
    this.onGetComponentInfo(() => {
      this.onGetTraitDefinitions();
      const { isEditTrait, traitItem, appName, project, dispatch } = this.props;
      if (isEditTrait && traitItem) {
        const { alias, type, description, properties } = traitItem;
        this.field.setValues({
          alias,
          type,
          description,
          properties,
        });
        if (type) {
          this.onDetailsTraitDefinition(type);
        }
      }
      dispatch({
        type: 'uischema/setAppName',
        payload: appName,
      });
      dispatch({
        type: 'uischema/setProject',
        payload: project,
      });
    });
  }

  onGetComponentInfo(callback: () => void) {
    const { appName, componentName } = this.props;
    if (appName && componentName) {
      getApplicationComponent(appName, componentName).then((res: ApplicationComponent) => {
        if (res) {
          this.setState(
            {
              component: res,
            },
            callback
          );
        }
      });
    }
  }

  onGetTraitDefinitions = async () => {
    const { component } = this.state;
    if (component?.definition) {
      getTraitDefinitions({ appliedWorkload: component?.definition.workload.type }).then(
        (res: { definitions?: DefinitionBase[] }) => {
          if (res) {
            const podDisruptive: any = {};
            res.definitions?.map((def) => {
              if (def.trait?.podDisruptive) {
                podDisruptive[def.name] = true;
              }
            });
            this.setState({
              traitDefinitions: res && res.definitions,
              podDisruptive: podDisruptive,
            });
          }
        }
      );
    }
  };

  onClose = () => {
    this.props.onClose();
  };

  onSubmit = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      const { appName = '', componentName = '', temporaryTraitList = [] } = this.props;
      const { alias = '', type = '', description = '', properties } = values;
      const query = { appName, componentName, traitType: type };
      const params: Trait = {
        alias,
        type,
        description,
        properties: JSON.stringify(properties),
      };
      const { isEditTrait, isEditComponent } = this.props;
      this.setState({ isLoading: true });
      if (isEditComponent) {
        if (isEditTrait) {
          updateTrait(params, query).then((res) => {
            if (res) {
              Message.success({
                duration: 4000,
                title: i18n.t('Trait properties update success.').toString(),
                content: i18n.t('You need to re-execute the workflow for it to take effect.').toString(),
              });
              this.props.onOK();
            }
            this.setState({ isLoading: false });
          });
        } else {
          createTrait(params, query).then((res) => {
            if (res) {
              Message.success({
                duration: 4000,
                title: i18n.t('Trait create success.').toString(),
                content: i18n.t('You need to re-execute the workflow for it to take effect.').toString(),
              });
              this.props.onOK();
            }
            this.setState({ isLoading: false });
          });
        }
      } else {
        const findSameType = temporaryTraitList.find((item) => item.type === type);
        if (!isEditTrait && !findSameType) {
          params.properties = JSON.parse(params.properties);
          this.props.createTemporaryTrait(params);
        } else if (!isEditTrait && findSameType) {
          return Message.warning(i18n.t('A trait with the same trait type exists, please modify it'));
        } else if (isEditTrait) {
          params.properties = JSON.parse(params.properties);
          this.props.upDateTemporaryTrait(params);
        }
      }
    });
  };

  transTraitDefinitions() {
    const { traitDefinitions } = this.state;
    return (traitDefinitions || []).map((item: { name: string }) => ({
      label: item.name,
      value: item.name,
    }));
  }

  onDetailsTraitDefinition = (value: string, callback?: () => void) => {
    this.setState({ definitionLoading: true });
    detailTraitDefinition({ name: value })
      .then((re) => {
        if (re) {
          this.setState({ definitionDetail: re, definitionLoading: false });
          this.setDefaultProperties(re)
            if (callback) {
              callback();
            }
        }
      })
      .catch(() => this.setState({ definitionLoading: false }));
  };

  setDefaultProperties = (definitionDetail: any) => {
    const properties = definitionDetail.schema?.properties;
    if (properties) {
        const defaultValues: Record<string, any> = {};
        for (const key in properties) {
            if (properties[key].default !== undefined) {
                defaultValues[key] = properties[key].default;
            }
        }
        this.field.setValues({ properties: defaultValues });
    }
  };

  handleTypeChange = (value: string) => {
    this.removeProperties();
    this.field.setValues({ type: value });
    this.onDetailsTraitDefinition(value);
    this.setAlias(value);
  };

  setAlias = (traitType: string) => {
    let alias = traitType;
    switch (traitType) {
      case 'scaler':
        alias = i18n.t('Manual Scaler');
        break;
      case 'http-route':
        alias = i18n.t('HTTP Route');
        break;
      case 'https-route':
        alias = i18n.t('HTTPs Route');
        break;
      case 'gateway':
        alias = i18n.t('HTTP Route');
        break;
      default:
    }
    this.field.setValue('alias', alias);
  };

  extButtonList = () => {
    const { onClose, isEditTrait } = this.props;
    const { isLoading } = this.state;
    return (
      <div>
        <Button type="secondary" onClick={onClose} className="margin-right-10">
          <Translation>Cancel</Translation>
        </Button>
        <Button type="primary" onClick={this.onSubmit} loading={isLoading}>
          <Translation>{isEditTrait ? i18n.t('Update') : i18n.t('Create')}</Translation>
        </Button>
      </div>
    );
  };

  showTraitTitle = () => {
    const { isEditTrait, onClose } = this.props;
    if (isEditTrait) {
      return (
        <span>
          <Icon type="arrow-left" onClick={onClose} className="cursor-pointer" />
          <span> {i18n.t('Edit Trait')} </span>
        </span>
      );
    } else {
      return (
        <span>
          <Icon type="arrow-left" onClick={onClose} className="cursor-pointer" />
          <span> {i18n.t('Add Trait')} </span>
        </span>
      );
    }
  };

  removeProperties = () => {
    this.field.remove('properties');
    this.setState({ definitionDetail: undefined });
  };

  render() {
    const init = this.field.init;
    const FormItem = Form.Item;
    const { Row, Col } = Grid;
    const { onClose, isEditTrait } = this.props;
    const { definitionDetail, definitionLoading, podDisruptive, propertiesMode } = this.state;
    const validator = (rule: Rule, value: any, callback: (error?: string) => void) => {
      this.uiSchemaRef.current?.validate(callback);
    };
    const traitType: string = this.field.getValue('type');

    return (
      <DrawerWithFooter
        title={this.showTraitTitle()}
        placement="right"
        width={800}
        onClose={onClose}
        extButtons={this.extButtonList()}
      >
        <Form field={this.field}>
          <If condition={podDisruptive && traitType && podDisruptive[traitType]}>
            <Row>
              <Col span={24}>
                <Message
                  type="warning"
                  title={i18n
                    .t('This trait properties change will cause pod restart after the application deploy')
                    .toString()}
                />
              </Col>
            </Row>
          </If>
          <Row>
            <Col span={24} style={{ padding: '0 8px' }}>
              <FormItem
                label={<Translation>Type</Translation>}
                required
                help={
                  <span>
                    <Translation>Get more trait type?</Translation>
                    <Link to="/addons">
                      <Translation>Go to enable addon</Translation>
                    </Link>
                  </span>
                }
              >
                <Select
                  className="select"
                  disabled={isEditTrait ? true : false}
                  placeholder={i18n.t('Please select').toString()}
                  {...init(`type`, {
                    rules: [
                      {
                        required: true,
                        message: i18n.t('Please select'),
                      },
                    ],
                  })}
                  dataSource={this.transTraitDefinitions()}
                  onChange={this.handleTypeChange}
                />
              </FormItem>
            </Col>
          </Row>
          <Row>
            <Col span={12} style={{ padding: '0 8px' }}>
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

            <Col span={12} style={{ padding: '0 8px' }}>
              <FormItem label={<Translation>Description</Translation>}>
                <Input
                  name="description"
                  placeholder={i18n.t('Please enter').toString()}
                  {...init('description', {
                    rules: [
                      {
                        maxLength: 256,
                        message: i18n.t('Enter a description that contains less than 256 characters.'),
                      },
                    ],
                  })}
                />
              </FormItem>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ padding: '0 8px' }}>
              <Card
                contentHeight={'auto'}
                style={{ marginTop: '8px' }}
                title={i18n.t('Properties').toString()}
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
                <Loading visible={definitionLoading}>
                  <If condition={definitionDetail}>
                    <FormItem required={true}>
                      <UISchema
                        key={traitType}
                        {...init(`properties`, {
                          rules: [
                            {
                              validator: validator,
                              message: i18n.t('Please check trait deploy properties'),
                            },
                          ],
                        })}
                        enableCodeEdit={propertiesMode === 'code'}
                        uiSchema={definitionDetail && definitionDetail.uiSchema}
                        definition={{
                          type: 'trait',
                          name: definitionDetail?.name || '',
                          description: definitionDetail?.description || '',
                        }}
                        ref={this.uiSchemaRef}
                        mode={this.props.isEditTrait ? 'edit' : 'new'}
                      />
                    </FormItem>
                  </If>
                  <If condition={!definitionDetail}>
                    <Message type="notice">
                      <Translation>Please select trait type first.</Translation>
                    </Message>
                  </If>
                </Loading>
              </Card>
            </Col>
          </Row>
        </Form>
      </DrawerWithFooter>
    );
  }
}

export default TraitDialog;
