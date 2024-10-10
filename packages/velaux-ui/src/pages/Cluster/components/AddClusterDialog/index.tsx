import { Button, Message, Grid, Dialog, Form, Input, Upload, Field, Loading } from '@alifd/next';
import React from 'react';
import { AiOutlineCloudUpload } from 'react-icons/ai';

import { getClusterDetails, updateCluster } from '../../../../api/cluster';
import DefinitionCode from '../../../../components/DefinitionCode';
import { Translation } from '../../../../components/Translation';
import type { Cluster } from '@velaux/data';
import { checkName } from '../../../../utils/common';
import { locale } from '../../../../utils/locale';
const { Col, Row } = Grid;

type Props = {
  editClusterName: string;
  visible: boolean;
  page?: number;
  pageSize?: number;
  query?: string;
  onOK: () => void;
  onClose: () => void;
  dispatch: ({}) => {};
};

type State = {
  editMode: boolean;
  cluster: Cluster;
};

class AddClusterDialog extends React.Component<Props, State> {
  field: Field;
  DefinitionCodeRef: React.RefObject<DefinitionCode>;
  constructor(props: Props) {
    super(props);
    this.field = new Field(this);
    this.DefinitionCodeRef = React.createRef();
    this.state = {
      editMode: false,
      cluster: {
        name: '',
        kubeConfig: '',
      },
    };
  }

  componentDidMount() {
    this.loadClusterDetail();
  }

  loadClusterDetail = () => {
    const { editClusterName } = this.props;
    if (editClusterName) {
      getClusterDetails({ clusterName: editClusterName }).then((re) => {
        this.setState({ cluster: re, editMode: true });
        this.field.setValues(re);
      });
    }
  };
  
  onClose = () => {
    this.props.onClose();
    this.resetField();
  };

  onOk = () => {
    const { editMode, cluster } = this.state;
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      if (editMode) {
        updateCluster({
          name: cluster?.name,
          alias: values.alias,
          icon: cluster?.icon,
          description: values.description,
          dashboardURL: values.dashboardURL,
          kubeConfig: values.kubeConfig,
          labels: cluster?.labels,
        }).then((re: any) => {
          if (re) {
            Message.success(<Translation>cluster update success</Translation>);
            this.resetField();
            this.props.onOK();
          }
        });
      } else {
        this.props.dispatch({
          type: 'clusters/createCluster',
          payload: values,
          callback: (re: any) => {
            if (re) {
              Message.success(<Translation>cluster add success</Translation>);
              this.resetField();
              this.props.onOK();
            }
          },
        });
      }
    });
  };

  resetField() {
    this.field.setValues({
      name: '',
      description: '',
      dashboardURL: '',
      kubeConfig: '',
    });
  }

  onError = () => {};

  customRequest = (option: any) => {
    const reader = new FileReader();
    const fileselect = option.file;
    reader.readAsText(fileselect);
    reader.onload = () => {
      this.field.setValues({
        kubeConfig: reader.result?.toString() || '',
      });
    };
    return {
      file: File,
      onError: this.onError,
      abort() {},
    };
  };

  render() {
    const { visible, editClusterName } = this.props;
    const { editMode, cluster } = this.state;
    const FormItem = Form.Item;
    const formItemLayout = {
      labelCol: {
        fixedSpan: 6,
      },
      wrapperCol: {
        span: 18,
      },
    };
    const init = this.field.init;
    const values: { kubeConfig: string } = this.field.getValues();
    const valueInfo = cluster?.kubeConfig || values.kubeConfig || '';
    return (
      <Dialog
        locale={locale().Dialog}
        title={
          editMode ? (
            <Translation>Edit Cluster Config</Translation>
          ) : (
            <Translation>Connect Existing Cluster</Translation>
          )
        }
        overflowScroll={true}
        autoFocus={true}
        width={800}
        visible={visible}
        onOk={this.onOk}
        onCancel={this.onClose}
        onClose={this.onClose}
        footerActions={['cancel', 'ok']}
        v2
      >
        <Loading visible={editClusterName && !editMode ? true : false} style={{ width: '100%' }}>
          <Form {...formItemLayout} field={this.field}>
            <Row>
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Name</Translation>} required>
                  <Input
                    name="name"
                    disabled={editMode}
                    {...init('name', {
                      initValue: cluster?.name || editClusterName,
                      rules: [
                        {
                          required: true,
                          pattern: checkName,
                          message: 'Please enter a valid name contains only alphabetical words',
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
                      initValue: cluster?.alias,
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
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Description</Translation>}>
                  <Input
                    defaultValue={cluster?.description}
                    name="description"
                    {...init('description', {
                      initValue: cluster?.description,
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
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Dashboard URL</Translation>}>
                  <Input
                    name="dashboardURL"
                    {...init('dashboardURL', {
                      initValue: cluster?.dashboardURL,
                      rules: [
                        {
                          required: false,
                          format: 'url',
                          message: 'Input according to URL specification',
                        },
                      ],
                    })}
                  />
                </FormItem>
              </Col>
            </Row>
            <Row>
              <Col span={24} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>KubeConfig</Translation>} labelAlign="top" required>
                  <Upload request={this.customRequest}>
                    <Button text type="normal" className="padding-left-0">
                      <AiOutlineCloudUpload />
                      <Translation>Upload Config File</Translation>
                    </Button>
                  </Upload>

                  <div id="guide-code" className="guide-code">
                    <DefinitionCode
                      containerId="guide-code"
                      language={'yaml'}
                      readOnly={false}
                      {...init('kubeConfig', {
                        initValue: cluster?.kubeConfig,
                        rules: [
                          {
                            required: true,
                            message: <Translation>Please upload or edit kube config</Translation>,
                          },
                        ],
                      })}
                      value={valueInfo}
                      ref={this.DefinitionCodeRef}
                    />
                  </div>
                </FormItem>
              </Col>
            </Row>
          </Form>
        </Loading>
      </Dialog>
    );
  }
}

export default AddClusterDialog;
