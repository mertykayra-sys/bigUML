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

export class GSubjectNode extends NamedElement {
    /** A frame - the box a subject’s use cases are drawn in - is drawn behind them and must stay there. */
    static override readonly DEFAULT_FEATURES = [...super.DEFAULT_FEATURES, staysBehindFeature];
}

/** A subject: the frame the use cases it offers are drawn inside. */
@injectable()
export class GSubjectNodeView extends FrameNodeView {}
