import React, { Component } from 'react';
import { connect } from 'dva';
import { If } from 'tsx-control-statements/components';
import { Grid } from '@b-design/ui';
import Title from '../../components/ListTitle';
import Menu from './components/Menu';
import Empty from '../../components/Empty';
import { IntegrationBase } from '../../interface/integrations';
import { getMatchParamObj } from '../../utils/utils';
import './index.less';

type Props = {
    activeName: string;
    integrationsConfigTypes: IntegrationBase[];
    history: {
        push: (path: string, state?: {}) => {};
    };
    location: {
        pathname: string;
    };
    match: {
        params: {
            configType: string;
        },
        path: string;
    };
    dispatch: ({ }) => {}
}

type State = {
    activeName: string;
}
@connect((store: any) => {
    return { ...store.integrations };
})
class IntegrationsLayout extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            activeName: this.getConfigType(),
        }
    }

    componentDidMount() {
        this.listConfigType(this.initMenuRoute);
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.location.pathname != this.props.location.pathname) {
            const nextPropsParams = nextProps.match.params || {};
            this.setState({
                activeName: nextPropsParams.configType
            })
        }

        if (nextProps.match.path === '/integrations') {
            const { integrationsConfigTypes } = nextProps
            const pathname = this.getIntegrationsFirstMenuName(integrationsConfigTypes);
            this.changeMenuRouter(pathname)
        }

    }

    listConfigType = (initMenuRoute?: (path: string) => void) => {
        this.props.dispatch({
            type: 'integrations/getConfigTypes',
            payload: {},
            callback: () => {
                const { integrationsConfigTypes } = this.props;
                const pathname = this.getIntegrationsFirstMenuName(integrationsConfigTypes);
                if (initMenuRoute) {
                    initMenuRoute(pathname);
                }
            },
        })
    }

    getConfigType = () => {
        return getMatchParamObj(this.props.match, 'configType');
    }

    getIntegrationsFirstMenuName = (data: IntegrationBase[]) => {
        return data && data[0] && data[0].name || '';
    }

    initMenuRoute = (pathname: string) => {
        if (this.props.match.path === '/integrations' && pathname) {
            const link = `/integrations/${pathname}`;
            this.props.history.push(link)
        }
    }

    changeMenuRouter = (pathname: string) => {
        if (!pathname) {
            return;
        }
        const link = `/integrations/${pathname}`;
        this.props.history.push(link)
    }

    render() {
        const { Row, Col } = Grid;
        const { integrationsConfigTypes } = this.props;
        const { activeName } = this.state;
        console.log('activeName', activeName)
        return (
            <div className='integrations-wrapper'>
                <Title title={'Integrations'} subTitle={'Integration with external systems and configuration management.'} />
                <If condition={!activeName}>
                    <Empty style={{ marginTop: '40px' }} />
                </If>
                <If condition={activeName}>
                    <Row>
                        <Col span='7'>
                            <Menu
                                activeName={activeName}
                                menuData={integrationsConfigTypes}
                            />
                        </Col>
                        <Col span='17'>
                            {this.props.children}
                        </Col>
                    </Row>
                </If>
            </div>
        )
    }
}

export default IntegrationsLayout;