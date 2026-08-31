/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/
import { injectable } from 'inversify';
import { NamedElement } from '../index.js';
import { RegionNodeView } from './region_node_view.js';
import { staysBehindFeature } from '../../../features/zorder/stays-behind.js';

export class GRegionNode extends NamedElement {
    /** A frame - the area a region’s states are drawn on - is drawn behind them and must stay there. */
    static override readonly DEFAULT_FEATURES = [...super.DEFAULT_FEATURES, staysBehindFeature];
}

@injectable()
export class GRegionNodeView extends RegionNodeView {}
