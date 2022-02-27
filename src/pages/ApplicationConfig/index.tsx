import React, { Component } from 'react';
import { Grid, Button, Card, Message } from '@b-design/ui';
import './index.less';
import { connect } from 'dva';
import { If } from 'tsx-control-statements/components';
import {
  getTraitDefinitions,
  getAppliationComponent,
  deleteTrait,
  getAppliationTriggers,
  deleteTriggers,
  deleteComponent,
} from '../../api/application';
import Translation from '../../components/Translation';
import Title from '../../components/Title';
import Item from '../../components/Item';
import TraitDialog from './components/TraitDialog';
import type {
  ApplicationDetail,
  Trait,
  ApplicationComponent,
  EnvBinding,
  Trigger,
  Workflow,
  ApplicationBase,
} from '../../interface/application';

import { momentDate } from '../../utils/common';
import locale from '../../utils/locale';
import TriggerList from './components/TriggerList';
import TriggerDialog from './components/TriggerDialog';
import EditAppDialog from '../ApplicationList/components/EditAppDialog';
import Components from './components/Components';
import ComponentDialog from './components/ComponentDialog';

const { Row, Col } = Grid;

type Props = {
  match: {
    params: {
      appName: string;
    };
  };
  history: {
    push: (path: string, state: {}) => {};
  };
  dispatch: ({}) => {};
  applicationDetail?: ApplicationDetail;
  components?: ApplicationComponent[];
  componentsApp?: string;
  envbinding?: EnvBinding[];
  workflows?: Workflow[];
};

type State = {
  appName: string;
  componentName: string;
  visibleTrait: boolean;
  isEditTrait: boolean;
  traitDefinitions: [];
  mainComponent?: ApplicationComponent;
  traitItem: Trait;
  triggers: Trigger[];
  visibleTrigger: boolean;
  createTriggerInfo: Trigger;
  showEditApplication: boolean;
  editItem: ApplicationBase;
  visibleComponent: boolean;
  temporaryTraitList: Trait[];
  isEditComponent: boolean;
  editComponent?: ApplicationComponent;
};
@connect((store: any) => {
  return { ...store.application };
})
class ApplicationConfig extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    const { params } = props.match;
    this.state = {
      appName: params.appName,
      componentName: '',
      isEditTrait: false,
      visibleTrait: false,
      traitDefinitions: [],
      traitItem: { type: '' },
      triggers: [],
      visibleTrigger: false,
      createTriggerInfo: { name: '', workflowName: '', type: 'webhook', token: '' },
      showEditApplication: false,
      editItem: {
        name: '',
        alias: '',
        icon: '',
        description: '',
        createTime: '',
      },
      visibleComponent: false,
      temporaryTraitList: [],
      isEditComponent: false,
    };
  }

  componentDidMount() {
    this.onGetTraitdefinitions();
    const { components, componentsApp } = this.props;
    const { appName } = this.state;
    if (components && components.length > 0 && componentsApp == appName) {
      const componentName = components[0].name || '';
      this.setState({ componentName }, () => {
        this.onGetAppliationComponent();
      });
    }
    this.onGetAppliationTrigger();
  }

  componentWillReceiveProps(nextProps: any) {
    if (nextProps.components !== this.props.components) {
      const componentName =
        (nextProps.components && nextProps.components[0] && nextProps.components[0].name) || '';
      this.setState({ componentName }, () => {
        this.onGetAppliationComponent();
      });
    }
  }

  onGetAppliationComponent() {
    const { appName, componentName } = this.state;
    const params = {
      appName,
      componentName,
    };
    getAppliationComponent(params).then((res: any) => {
      if (res) {
        this.setState({
          mainComponent: res,
          editComponent: res,
        });
      }
    });
  }

  onGetAppliationTrigger() {
    const { appName } = this.state;
    const params = {
      appName,
    };
    getAppliationTriggers(params).then((res: any) => {
      if (res) {
        this.setState({
          triggers: res.triggers || [],
        });
      }
    });
  }

  onGetTraitdefinitions = async () => {
    getTraitDefinitions().then((res: any) => {
      if (res) {
        this.setState({
          traitDefinitions: res && res.definitions,
        });
      }
    });
  };

  onDeleteTrait = async (traitType: string) => {
    const { appName, componentName, isEditComponent, temporaryTraitList } = this.state;
    const params = {
      appName,
      componentName,
      traitType,
    };
    if (isEditComponent) {
      deleteTrait(params).then((res: any) => {
        if (res) {
          this.onGetAppliationComponent();
        }
      });
    } else {
      const filterTemporaryTraitList = temporaryTraitList.filter((item) => item.type != traitType);
      this.setState({
        temporaryTraitList: filterTemporaryTraitList,
      });
    }
  };

  onClose = () => {
    this.setState({ visibleTrait: false, isEditTrait: false });
  };

  onOk = () => {
    this.onGetAppliationComponent();
    this.setState({
      isEditTrait: false,
      visibleTrait: false,
    });
  };

  onAddTrait = () => {
    this.setState({
      visibleTrait: true,
      traitItem: { type: '' },
      isEditTrait: false,
    });
  };

  changeTraitStats = (isEditTrait: boolean, traitItem: Trait) => {
    this.setState({
      visibleTrait: true,
      isEditTrait,
      traitItem,
    });
  };

  onAddTrigger = () => {
    this.setState({
      visibleTrigger: true,
    });
  };

  onTriggerClose = () => {
    this.setState({
      visibleTrigger: false,
    });
  };

  onTriggerOk = (res: Trigger) => {
    this.onGetAppliationTrigger();
    this.setState({
      visibleTrigger: false,
      createTriggerInfo: res,
    });
  };

  onDeleteTrigger = async (token: string) => {
    const { appName } = this.state;
    const params = {
      appName,
      token,
    };
    deleteTriggers(params).then((res: any) => {
      if (res) {
        this.onGetAppliationTrigger();
      }
    });
  };

  editAppPlan = () => {
    const { applicationDetail } = this.props;
    const {
      alias = '',
      description = '',
      name = '',
      createTime = '',
      icon = '',
    } = applicationDetail || {};
    this.setState({
      editItem: {
        name,
        alias,
        description,
        createTime,
        icon,
      },
      showEditApplication: true,
    });
  };

  onOkEditAppDialog = () => {
    this.setState({
      showEditApplication: false,
    });
    window.onGetApplicationDetails();
  };

  onCloseEditAppDialog = () => {
    this.setState({
      showEditApplication: false,
    });
  };

  onGetEditComponentInfo(componentName: string, callback: () => void) {
    const { appName } = this.state;
    const params = {
      appName,
      componentName,
    };
    getAppliationComponent(params).then((res: any) => {
      if (res) {
        this.setState({
          editComponent: res,
        });
      }
      if (callback) {
        callback();
      }
    });
  }

  editComponentstats = (component: ApplicationComponent) => {
    this.onGetEditComponentInfo(component.name, () => {
      this.setState({
        isEditComponent: true,
        visibleComponent: true,
        componentName: component.name,
      });
    });
  };

  onAddComponent = () => {
    this.setState({
      visibleComponent: true,
      isEditComponent: false,
    });
  };

  onDeleteComponent = async (componentName: string) => {
    const { appName } = this.state;
    const params = {
      appName,
      componentName,
    };
    deleteComponent(params).then((res: any) => {
      if (res) {
        window.onGetApplicationDetails();
      }
    });
  };

  createTemporaryTraitList = (trait: Trait) => {
    this.setState({
      temporaryTraitList: [...this.state.temporaryTraitList, trait],
      visibleTrait: false,
    });
  };

  upDateTemporaryTraitList = (trait: Trait) => {
    const { temporaryTraitList } = this.state;
    const updateTraitList: Trait[] = [];
    (temporaryTraitList || []).map((item) => {
      let newTraitItem: Trait = { type: '' };
      if (item.type === trait.type) {
        newTraitItem = trait;
      } else {
        newTraitItem = item;
      }
      updateTraitList.push(newTraitItem);
    });

    this.setState({
      temporaryTraitList: updateTraitList,
      visibleTrait: false,
    });
  };

  onComponentClose = () => {
    this.setState({
      visibleComponent: false,
    });
  };

  onComponentOK = () => {
    this.setState(
      {
        visibleComponent: false,
      },
      () => {
        window.onGetApplicationDetails();
      },
    );
  };

  render() {
    const { applicationDetail, workflows, components } = this.props;
    const {
      visibleTrait,
      isEditTrait,
      traitDefinitions,
      appName = '',
      componentName = '',
      mainComponent,
      traitItem,
      triggers,
      visibleTrigger,
      createTriggerInfo,
      showEditApplication,
      editItem,
      visibleComponent,
      temporaryTraitList,
      isEditComponent,
      editComponent,
    } = this.state;

    return (
      <div>
        <Row>
          <Col span={12} className="padding16">
            <Message
              type="notice"
              title="Note that baseline configuration changes will be applied to all environments"
            />
          </Col>
          <Col span={12} className="padding16 flexright">
            <Button onClick={this.editAppPlan} type="secondary">
              <Translation>Edit</Translation>
            </Button>
          </Col>
        </Row>
        <Row>
          <Col span={24} className="padding16">
            <Card locale={locale.Card} contentHeight="auto">
              <Row wrap={true}>
                <Col m={12} xs={24}>
                  <Item
                    label={<Translation>Name</Translation>}
                    value={applicationDetail && applicationDetail.name}
                  />
                </Col>
                <Col m={12} xs={24}>
                  <Item
                    label={<Translation>Alias</Translation>}
                    value={applicationDetail && applicationDetail.alias}
                  />
                </Col>
              </Row>
              <Row wrap={true}>
                <Col m={12} xs={24}>
                  <Item
                    label={<Translation>Create Time</Translation>}
                    value={momentDate((applicationDetail && applicationDetail.createTime) || '')}
                  />
                </Col>
                <Col m={12} xs={24}>
                  <Item
                    label={<Translation>Update Time</Translation>}
                    value={momentDate((applicationDetail && applicationDetail.updateTime) || '')}
                  />
                </Col>
              </Row>
              <Row wrap={true}>
                <Col span={24}>
                  <Item
                    label={<Translation>Description</Translation>}
                    labelSpan={4}
                    value={applicationDetail && applicationDetail.description}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <If condition={applicationDetail?.applicationType == 'common'}>
          <Row>
            <Col span={24} className="padding16">
              <Title
                title={
                  <span className="font-size-16 font-weight-bold">
                    <Translation>Components</Translation>{' '}
                  </span>
                }
                actions={[
                  <a
                    key={'add'}
                    onClick={this.onAddComponent}
                    className="font-size-14 font-weight-400"
                  >
                    <Translation>New Component</Translation>
                  </a>,
                ]}
              />
            </Col>
          </Row>

          <Components
            components={components || []}
            editComponentstats={(component: ApplicationComponent) => {
              this.editComponentstats(component);
            }}
            onDeleteComponent={(componenName: string) => {
              this.onDeleteComponent(componenName);
            }}
            onAddComponent={this.onAddComponent}
          />

          <If condition={triggers.length > 0}>
            <Row>
              <Col span={24} className="padding16">
                <Title
                  actions={[
                    <a
                      key={'add'}
                      className="font-size-14 font-weight-400"
                      onClick={this.onAddTrigger}
                    >
                      <Translation>New Trigger</Translation>
                    </a>,
                  ]}
                  title={
                    <span className="font-size-16 font-weight-bold">
                      {' '}
                      <Translation>Triggers</Translation>{' '}
                    </span>
                  }
                />
              </Col>
            </Row>
            <TriggerList
              triggers={triggers}
              component={mainComponent}
              onDeleteTrigger={(token: string) => {
                this.onDeleteTrigger(token);
              }}
              createTriggerInfo={createTriggerInfo}
            />
          </If>
        </If>

        <If condition={visibleTrait}>
          <TraitDialog
            visible={visibleTrait}
            isEditComponent={isEditComponent}
            appName={appName}
            componentName={componentName}
            isEditTrait={isEditTrait}
            traitItem={traitItem}
            traitDefinitions={traitDefinitions}
            temporaryTraitList={temporaryTraitList}
            onClose={this.onClose}
            onOK={this.onOk}
            createTemporaryTraitList={(trait: Trait) => {
              this.createTemporaryTraitList(trait);
            }}
            upDateTemporaryTraitList={(trait: Trait) => {
              this.upDateTemporaryTraitList(trait);
            }}
          />
        </If>

        <If condition={visibleTrigger}>
          <TriggerDialog
            visible={visibleTrigger}
            appName={appName}
            componentType={(mainComponent && mainComponent.type) || ''}
            workflows={workflows}
            onClose={this.onTriggerClose}
            onOK={(res: Trigger) => {
              this.onTriggerOk(res);
            }}
          />
        </If>

        <If condition={showEditApplication}>
          <EditAppDialog
            editItem={editItem}
            onOK={this.onOkEditAppDialog}
            onClose={this.onCloseEditAppDialog}
          />
        </If>

        <If condition={visibleComponent}>
          <ComponentDialog
            appName={appName}
            componentName={componentName}
            componentType={(mainComponent && mainComponent.type) || ''}
            editComponent={editComponent}
            isEditComponent={isEditComponent}
            temporaryTraitList={temporaryTraitList}
            onComponentClose={this.onComponentClose}
            onComponentOK={this.onComponentOK}
            onAddTrait={this.onAddTrait}
            changeTraitStats={(is: boolean, trait: Trait) => {
              this.changeTraitStats(is, trait);
            }}
            onDeleteTrait={(traitType: string) => {
              this.onDeleteTrait(traitType);
            }}
          />
        </If>
      </div>
    );
  }
}

export default ApplicationConfig;
