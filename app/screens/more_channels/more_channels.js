// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Platform,
    InteractionManager,
    StyleSheet,
    View
} from 'react-native';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ChannelList from 'app/components/custom_list';
import ChannelListRow from 'app/components/custom_list/channel_list_row';
import Loading from 'app/components/loading';
import SearchBar from 'app/components/search_bar';
import StatusBar from 'app/components/status_bar';
import {alertErrorWithFallback} from 'app/utils/general';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

class MoreChannels extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        currentUserId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        canCreateChannels: PropTypes.bool.isRequired,
        channels: PropTypes.array,
        closeButton: PropTypes.object,
        requestStatus: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            getChannels: PropTypes.func.isRequired,
            searchChannels: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired
        }).isRequired
    };

    leftButton = {
        id: 'close-more-channels'
    };

    rightButton = {
        id: 'create-pub-channel',
        showAsAction: 'always'
    };

    constructor(props) {
        super(props);

        this.searchTimeoutId = 0;

        this.state = {
            channels: props.channels.splice(0, General.CHANNELS_CHUNK_SIZE),
            page: 0,
            adding: false,
            next: true,
            searching: false,
            showNoResults: false,
            term: ''
        };
        this.rightButton.title = props.intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});
        this.leftButton = {...this.leftButton, icon: props.closeButton};

        const buttons = {
            leftButtons: [this.leftButton]
        };

        if (props.canCreateChannels) {
            buttons.rightButtons = [this.rightButton];
        }

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        // set the timeout to 400 cause is the time that the modal takes to open
        // Somehow interactionManager doesn't care
        setTimeout(() => {
            this.props.actions.getChannels(this.props.currentTeamId, 0);
        }, 400);
    }

    componentWillReceiveProps(nextProps) {
        const {requestStatus} = this.props;
        if (this.state.searching &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const channels = this.filterChannels(nextProps.channels, this.state.term);
            this.setState({channels, showNoResults: true});
        } else if (requestStatus.status === RequestStatus.STARTED &&
            nextProps.requestStatus.status === RequestStatus.SUCCESS) {
            const {page} = this.state;
            const channels = nextProps.channels.splice(0, (page + 1) * General.CHANNELS_CHUNK_SIZE);
            this.setState({channels, showNoResults: true});
        }

        this.headerButtons(nextProps.canCreateChannels, true);
    }

    close = () => {
        this.props.navigator.dismissModal({animationType: 'slide-down'});
    };

    emitCanCreateChannel = (enabled) => {
        this.headerButtons(this.props.canCreateChannels, enabled);
    };

    headerButtons = (canCreateChannels, enabled) => {
        const buttons = {
            leftButtons: [this.leftButton]
        };

        if (canCreateChannels) {
            buttons.rightButtons = [{...this.rightButton, disabled: !enabled}];
        }

        this.props.navigator.setButtons(buttons);
    };

    filterChannels = (channels, term) => {
        return channels.filter((c) => {
            return (c.name.toLowerCase().indexOf(term) !== -1 || c.display_name.toLowerCase().indexOf(term) !== -1);
        });
    };

    searchProfiles = (text) => {
        const term = text.toLowerCase();

        if (term) {
            const channels = this.filterChannels(this.state.channels, term);
            this.setState({channels, term, searching: true});
            clearTimeout(this.searchTimeoutId);

            this.searchTimeoutId = setTimeout(() => {
                this.props.actions.searchChannels(this.props.currentTeamId, term);
            }, General.SEARCH_TIMEOUT_MILLISECONDS);
        } else {
            this.cancelSearch();
        }
    };

    cancelSearch = () => {
        this.props.actions.getChannels(this.props.currentTeamId, 0);
        this.setState({
            term: '',
            searching: false,
            page: 0
        });
    };

    loadMoreChannels = () => {
        let {page} = this.state;
        if (this.props.requestStatus.status !== RequestStatus.STARTED && this.state.next && !this.state.searching) {
            page = page + 1;
            this.props.actions.getChannels(
                this.props.currentTeamId,
                page,
                General.CHANNELS_CHUNK_SIZE).
            then((data) => {
                if (data && data.length) {
                    this.setState({
                        page
                    });
                } else {
                    this.setState({next: false});
                }
            });
        }
    };

    renderChannelRow = (channel, sectionId, rowId, preferences, theme, selectable, onPress, onSelect) => {
        const {id, display_name: displayName, purpose} = channel;
        let onRowSelect = null;
        if (selectable) {
            onRowSelect = () => onSelect(sectionId, rowId);
        }

        return (
            <ChannelListRow
                id={id}
                displayName={displayName}
                purpose={purpose}
                theme={theme}
                onPress={onPress}
                selectable={selectable}
                selected={channel.selected}
                onRowSelect={onRowSelect}
            />
        );
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-more-channels':
                this.close();
                break;
            case 'create-pub-channel':
                this.onCreateChannel();
                break;
            }
        }
    };

    onSelectChannel = async (id) => {
        const {actions, currentTeamId, currentUserId, intl} = this.props;
        const {channels} = this.state;

        this.emitCanCreateChannel(false);
        this.setState({adding: true});

        const channel = channels.find((c) => c.id === id);
        const result = await actions.joinChannel(currentUserId, currentTeamId, id);

        if (result.error) {
            alertErrorWithFallback(
                intl,
                result.error,
                {
                    id: 'mobile.join_channel.error',
                    defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again."
                },
                {
                    displayName: channel ? channel.display_name : ''
                }
            );
            this.emitCanCreateChannel(true);
            this.setState({adding: false});
        } else {
            if (channel) {
                actions.setChannelDisplayName(channel.display_name);
            } else {
                actions.setChannelDisplayName('');
            }
            await actions.handleSelectChannel(id);

            EventEmitter.emit('close_channel_drawer');
            InteractionManager.runAfterInteractions(() => {
                this.close();
            });
        }
    };

    onCreateChannel = () => {
        const {intl, navigator, theme} = this.props;

        navigator.push({
            screen: 'CreateChannel',
            animationType: 'slide-up',
            title: intl.formatMessage({id: 'mobile.create_channel.public', defaultMessage: 'New Public Channel'}),
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            },
            passProps: {
                channelType: General.OPEN_CHANNEL
            }
        });
    };

    render() {
        const {intl, requestStatus, theme} = this.props;
        const {adding, channels, searching, term} = this.state;
        const {formatMessage} = intl;
        const isLoading = requestStatus.status === RequestStatus.STARTED || requestStatus.status === RequestStatus.NOT_STARTED;
        const style = getStyleFromTheme(theme);
        const more = searching ? () => true : this.loadMoreChannels;

        let content;
        if (adding) {
            content = (<Loading/>);
        } else {
            content = (
                <View style={{flex: 1}}>
                    <View
                        style={{marginVertical: 5}}
                    >
                        <SearchBar
                            ref='search_bar'
                            placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                            cancelTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                            backgroundColor='transparent'
                            inputHeight={33}
                            inputStyle={{
                                backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
                                color: theme.centerChannelColor,
                                fontSize: 13
                            }}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            tintColorSearch={changeOpacity(theme.centerChannelColor, 0.8)}
                            tintColorDelete={changeOpacity(theme.centerChannelColor, 0.5)}
                            titleCancelColor={theme.centerChannelColor}
                            onChangeText={this.searchProfiles}
                            onSearchButtonPress={this.searchProfiles}
                            onCancelButtonPress={this.cancelSearch}
                            value={term}
                        />
                    </View>
                    <ChannelList
                        data={channels}
                        theme={theme}
                        searching={searching}
                        onListEndReached={more}
                        loading={isLoading}
                        selectable={false}
                        listScrollRenderAheadDistance={50}
                        showSections={false}
                        renderRow={this.renderChannelRow}
                        onRowPress={this.onSelectChannel}
                        loadingText={{id: 'mobile.loading_channels', defaultMessage: 'Loading Channels...'}}
                        showNoResults={this.state.showNoResults}
                    />
                </View>
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                {content}
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        navTitle: {
            ...Platform.select({
                android: {
                    fontSize: 18
                },
                ios: {
                    fontSize: 15,
                    fontWeight: 'bold'
                }
            })
        }
    });
});

export default injectIntl(MoreChannels);
