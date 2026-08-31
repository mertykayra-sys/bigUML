/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/
import { injectable } from 'inversify';
import { NamedElement } from '../named-element/index.js';
import { FrameNodeView } from '../../views/uml-frame.view.js';
import { staysBehindFeature } from '../../../features/zorder/stays-behind.js';

export class GInteractionNode extends NamedElement {
    /** A frame - the frame the whole communication or sequence diagram is drawn inside - is drawn behind them and must stay there. */
    static override readonly DEFAULT_FEATURES = [...super.DEFAULT_FEATURES, staysBehindFeature];
}

/** An interaction: the frame the whole communication diagram is drawn inside. */
@injectable()
export class GInteractionNodeView extends FrameNodeView {}
