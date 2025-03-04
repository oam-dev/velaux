import { Grid, Form, Input, Field, Button, Message } from '@alifd/next';
import React from 'react';

import { updateUser } from '../../../../api/users';
import DrawerWithFooter from '../../../../components/Drawer';
import { Translation } from '../../../../components/Translation';
import i18n from '../../../../i18n';
import type { User } from '@velaux/data';
import { checkUserPassword } from '../../../../utils/common';

type Props = {
  visible: boolean;
  editUser: User;
  isResetPassword: boolean;
  onCreate: () => void;
  onClose: () => void;
};

type State = {
  loading: boolean;
};

class ResetPassword extends React.Component<Props, State> {
  field: Field;
  constructor(props: Props) {
    super(props);
    this.field = new Field(this);
    this.state = {
      loading: false,
    };
  }

  onClose = () => {
    this.props.onClose();
  };

  onCreate = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      const { isResetPassword, editUser } = this.props;
      const { alias, name } = editUser;
      const { password } = values;

      const params = {
        name,
        alias,
        password,
      };

      if (isResetPassword) {
        updateUser(params).then((res) => {
          if (res) {
            Message.success(<Translation>update user success</Translation>);
            this.props.onCreate();
          }
        });
      }
    });
  };

  showTitle = () => {
    const { isResetPassword } = this.props;
    if (isResetPassword) {
      return <Translation>Reset Password</Translation>;
    }
    return '';
  };

  showClickButtons = () => {
    const { loading } = this.state;
    return [
      <Button type="secondary" onClick={this.onClose} style={{ marginRight: '16px' }}>
        <Translation>Cancel</Translation>
      </Button>,
      <Button type="primary" onClick={this.onCreate} loading={loading}>
        <Translation>Update</Translation>
      </Button>,
    ];
  };

  render() {
    const init = this.field.init;
    const { Row, Col } = Grid;
    const FormItem = Form.Item;
    const formItemLayout = {
      labelCol: {
        fixedSpan: 6,
      },
      wrapperCol: {
        span: 20,
      },
    };

    return (
      <React.Fragment>
        <DrawerWithFooter
          title={this.showTitle()}
          placement="right"
          width={800}
          onClose={this.onClose}
          extButtons={this.showClickButtons()}
        >
          <Form {...formItemLayout} field={this.field}>
            <Row>
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Password</Translation>} required>
                  <Input
                    name="password"
                    htmlType="password"
                    placeholder={i18n.t('Please enter').toString()}
                    {...init('password', {
                      rules: [
                        {
                          required: true,
                          pattern: checkUserPassword,
                          message: (
                            <Translation>
                              Password must be alphanumeric, contain at least one letter and one number, and be 8-16 characters long
                            </Translation>
                          ),
                        },
                      ],
                    })}
                  />
                </FormItem>
              </Col>
            </Row>
          </Form>
        </DrawerWithFooter>
      </React.Fragment>
    );
  }
}

export default ResetPassword;
