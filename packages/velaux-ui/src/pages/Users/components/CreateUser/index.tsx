import { Grid, Form, Input, Field, Button, Message, Select } from '@alifd/next';
import React from 'react';

import { createUser, updateUser } from '../../../../api/users';
import DrawerWithFooter from '../../../../components/Drawer';
import { Translation } from '../../../../components/Translation';
import i18n from '../../../../i18n';
import type { RolesBase , User } from '@velaux/data';
import { checkUserPassword, checkName } from '../../../../utils/common';
import { locale } from '../../../../utils/locale';
import { getSelectLabel } from '../../../../utils/utils';

type Props = {
  visible: boolean;
  isEditUser: boolean;
  editUser: User;
  rolesList: RolesBase[];
  onCreate: () => void;
  onClose: () => void;
};

type State = {
  loading: boolean;
};

class CreateUser extends React.Component<Props, State> {
  field: Field;
  constructor(props: Props) {
    super(props);
    this.field = new Field(this);
    this.state = {
      loading: false,
    };
  }

  componentDidMount() {
    const { isEditUser, editUser } = this.props;
    if (isEditUser && editUser) {
      const { alias, createTime, email, lastLoginTime, password, name, roles } = editUser;
      const rolesName = roles?.map((item) => {
        return item.name;
      });
      this.field.setValues({
        name,
        alias,
        createTime,
        password,
        email,
        lastLoginTime,
        roles: rolesName,
      });
    }
  }

  onClose = () => {
    this.props.onClose();
  };

  onCreate = () => {
    this.field.validate((error: any, values: any) => {
      if (error) {
        return;
      }
      const { isEditUser, editUser } = this.props;
      const { name, alias, email, password, roles } = values;

      const params = {
        name,
        alias,
        email,
        password,
        roles,
      };

      if (isEditUser && editUser.email) {
        delete params.email;
      }

      if (isEditUser) {
        updateUser(params).then((res) => {
          if (res) {
            Message.success(<Translation>User updated successfully</Translation>);
            this.props.onCreate();
          }
        });
      } else {
        createUser(params).then((res) => {
          if (res) {
            Message.success(<Translation>User created successfully</Translation>);
            this.props.onCreate();
          }
        });
      }
    });
  };

  showTitle = () => {
    const { isEditUser } = this.props;
    if (isEditUser) {
      return <Translation>Edit User</Translation>;
    } else {
      return <Translation>New User</Translation>;
    }
  };

  showClickButtons = () => {
    const { isEditUser } = this.props;
    const { loading } = this.state;
    let createEle;
    if (isEditUser) {
      createEle = (
        <Button type="primary" onClick={this.onCreate} loading={loading}>
          <Translation>Update</Translation>
        </Button>
      );
    } else {
      createEle = (
        <Button type="primary" onClick={this.onCreate} loading={loading}>
          <Translation>Create</Translation>
        </Button>
      );
    }

    return [
      <Button type="secondary" onClick={this.onClose} style={{ marginRight: '16px' }}>
        <Translation>Cancel</Translation>
      </Button>,
      createEle,
    ];
  };

  render() {
    const init = this.field.init;
    const { Row, Col } = Grid;
    const FormItem = Form.Item;
    const { isEditUser, editUser, rolesList } = this.props;

    const formItemLayout = {
      labelCol: {
        fixedSpan: 6,
      },
      wrapperCol: {
        span: 20,
      },
    };
    const rolesListSelect = getSelectLabel(rolesList);

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
                <FormItem label={<Translation>Name</Translation>} labelTextAlign="left" required>
                  <Input
                    name="name"
                    placeholder={i18n.t('Please enter').toString()}
                    maxLength={32}
                    disabled={isEditUser ? true : false}
                    {...init('name', {
                      rules: [
                        {
                          required: true,
                          pattern: checkName,
                          message: <Translation>Please enter a valid name having alphanumeric characters only</Translation>,
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
                    placeholder={i18n.t('Please input the alias').toString()}
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
              {!isEditUser && (
                <Col span={12} style={{ padding: '0 8px' }}>
                  <FormItem label={<Translation>Password</Translation>} required>
                    <Input
                      name="password"
                      htmlType="password"
                      autoComplete={'new-password'}
                      placeholder={i18n.t('Please input the password').toString()}
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
              )}
              <Col span={12} style={{ padding: '0 8px' }}>
                <FormItem label={<Translation>Email</Translation>} required>
                  <Input
                    name="email"
                    placeholder={i18n.t('Please input a email').toString()}
                    autoComplete={'off'}
                    disabled={isEditUser && editUser.email ? true : false}
                    {...init('email', {
                      rules: [
                        {
                          required: true,
                          format: 'email',
                          message: <Translation>Please input a valid email</Translation>,
                        },
                      ],
                    })}
                  />
                </FormItem>
              </Col>
            </Row>

            <Row>
              <Col span={24} style={{ padding: '0 8px' }}>
                <FormItem
                  help={i18n
                    .t('Application developers should be assigned project roles instead of platform roles.')
                    .toString()}
                  label={<Translation>Platform Roles</Translation>}
                  labelTextAlign="left"
                >
                  <Select
                    {...init(`roles`, {
                      rules: [
                        {
                          required: false,
                          message: 'Please select roles',
                        },
                      ],
                    })}
                    locale={locale().Select}
                    mode="multiple"
                    dataSource={rolesListSelect}
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

export default CreateUser;
