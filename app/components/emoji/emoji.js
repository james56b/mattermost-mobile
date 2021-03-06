// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Image, Text} from 'react-native';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {EmojiIndicesByAlias, Emojis} from 'app/utils/emojis';

import {Client} from 'mattermost-redux/client';

export default class Emoji extends React.PureComponent {
    static propTypes = {
        customEmojis: PropTypes.object,
        emojiName: PropTypes.string.isRequired,
        literal: PropTypes.string,
        size: PropTypes.number.isRequired,
        textStyle: CustomPropTypes.Style
    }

    static defaultProps = {
        customEmojis: new Map(),
        literal: ''
    }

    render() {
        const {
            customEmojis,
            emojiName,
            literal,
            size,
            textStyle
        } = this.props;

        let imageUrl;
        if (EmojiIndicesByAlias.has(emojiName)) {
            const emoji = Emojis[EmojiIndicesByAlias.get(emojiName)];
            imageUrl = Client.getSystemEmojiImageUrl(emoji.filename);
        } else if (customEmojis.has(emojiName)) {
            const emoji = customEmojis.get(emojiName);
            imageUrl = Client.getCustomEmojiImageUrl(emoji.id);
        }

        if (!imageUrl) {
            return <Text style={textStyle}>{literal}</Text>;
        }

        return (
            <Image
                style={{width: size, height: size, padding: 10}}
                source={{uri: imageUrl}}
            />
        );
    }
}
