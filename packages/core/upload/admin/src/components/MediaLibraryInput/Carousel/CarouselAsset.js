import React from 'react';
import styled from 'styled-components';
import IconDocumentation from '@strapi/icons/IconDocumentation';
import { Icon } from '@strapi/parts/Icon';
import { Box } from '@strapi/parts/Box';
import { AssetType, AssetDefinition } from '../../../constants';
import { VideoPreview } from '../../AssetCard/VideoPreview';
import { createAssetUrl } from '../../../utils/createAssetUrl';

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    max-width: 100%;
    height: 124px;
  }
`;

export const CarouselAsset = ({ asset }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper height="100%">
        <VideoPreview url={createAssetUrl(asset)} mime={asset.mime} uniqueKey={asset.updatedAt} />
      </VideoPreviewWrapper>
    );
  }

  if (asset.mime.includes(AssetType.Image)) {
    return (
      <Box
        as="img"
        maxHeight="100%"
        maxWidth="100%"
        src={createAssetUrl(asset)}
        alt={asset.alternativeText || asset.name}
      />
    );
  }

  return <Icon as={IconDocumentation} />;
};

CarouselAsset.propTypes = {
  asset: AssetDefinition.isRequired,
};
