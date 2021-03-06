// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {TouchableHighlight, View} from 'react-native';
import RNBottomSheet from 'react-native-bottom-sheet';

export default class OptionsContext extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        cancelText: PropTypes.string,
        children: PropTypes.node.isRequired,
        onPress: PropTypes.func.isRequired,
        toggleSelected: PropTypes.func.isRequired
    };

    static defaultProps = {
        actions: [],
        cancelText: 'Cancel'
    };

    show = () => {
        const {actions, cancelText} = this.props;
        if (actions.length) {
            const actionsText = actions.map((a) => a.text);
            RNBottomSheet.showBottomSheetWithOptions({
                options: [...actionsText, cancelText],
                cancelButtonIndex: actions.length
            }, (value) => {
                if (value !== actions.length) {
                    const selectedOption = actions[value];
                    if (selectedOption && selectedOption.onPress) {
                        selectedOption.onPress();
                    }
                }
            });
        }
    };

    handleHideUnderlay = () => {
        this.props.toggleSelected(false);
    };

    handleShowUnderlay = () => {
        this.props.toggleSelected(true);
    };

    render() {
        return (
            <TouchableHighlight
                onHideUnderlay={this.handleHideUnderlay}
                onLongPress={this.show}
                onPress={this.props.onPress}
                onShowUnderlay={this.handleShowUnderlay}
                underlayColor='transparent'
                style={{flex: 1, flexDirection: 'row'}}
            >
                <View style={{flex: 1}}>
                    {this.props.children}
                </View>
            </TouchableHighlight>
        );
    }
}
