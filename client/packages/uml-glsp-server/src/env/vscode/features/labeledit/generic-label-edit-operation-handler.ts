/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import {
    behaviorLabelPatch,
    interactionUsePatch,
    lifelineIdentPatch,
    parseConstraint,
    parseStateInvariant,
    parseStereotype,
    STEREOTYPE_LABEL_SUFFIX,
    storableGuard,
    storableName,
    storableProse,
    storableText,
    type BehaviorLabelElement,
    type InteractionUseElement,
    type LifelineIdentElement
} from '@borkdominik-biguml/uml-glsp-server';
import {
    isInitialState,
    isInteractionUse,
    isLifeline,
    isDurationConstraint,
    isNote,
    isStateInvariant,
    isStatePart,
    isTextLabel,
    isTransition,
    reflection
} from '@borkdominik-biguml/uml-model-server/grammar';
import { hasTextName, isTextProperty } from '@borkdominik-biguml/uml-glsp-server/gen/vscode';
import { ApplyLabelEditOperation, type Command, OperationHandler } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { type AstNode, isAstNode } from 'langium';

type LabelPatch = { op: 'add'; path: string; value: string } | { op: 'remove'; path: string };

/** What the label beside a transition's guard stands for: the rest of `trigger [guard] / effect`. */
const TRANSITION_LABEL_PARTS = ['trigger', 'effect'] as const;
import { EDGE_GUARD_LABEL_SUFFIX, EDGE_MODIFIERS_LABEL_SUFFIX, storableModifiers } from '../../elements/core/edge-label.js';
import { KEYWORD_LABEL_SUFFIX } from '../../elements/interaction-use.element.js';
import { ModelPatchCommand } from '../command/model-patch-command.js';
import { type DiagramModelState } from '../model/diagram-model-state.js';

@injectable()
export class GenericLabelEditOperationHandler extends OperationHandler {
    override operationType = ApplyLabelEditOperation.KIND;

    declare readonly modelState: DiagramModelState;

    override createCommand(operation: ApplyLabelEditOperation): Command {
        const patch = this.buildPatch(operation);
        return new ModelPatchCommand(this.modelState, patch);
    }

    /**
     * The element a label belongs to. A label's id is that element's id with a suffix naming the label -
     * `<id>_name_label` - so the suffix is cut back a part at a time until what is left is an id the
     * model knows, longest first.
     *
     * Cutting at the first `_` instead took the element id itself apart: ids are written `<type>_<uuid>`
     * (see `createRandomUUID`), so every label resolved to the bare type name, which is no element at
     * all - and `buildPatch` then dropped every edit on the floor. Trimming rather than matching a fixed
     * suffix also keeps this working for ids that carry an underscore of their own.
     */
    protected getSemanticIdFromLabelId(labelId: string): string {
        const parts = labelId.split('_');
        for (let count = parts.length; count > 0; count--) {
            const candidate = parts.slice(0, count).join('_');
            if (this.modelState.index.findSemanticElement(candidate, isAstNode)) {
                return candidate;
            }
        }
        return labelId;
    }

    // override if some types use a different field

    protected getLabelPropertyName(_astNode: unknown): string {
        return 'name';
    }

    protected buildPatch(operation: ApplyLabelEditOperation): string {
        const semanticId = this.getSemanticIdFromLabelId(operation.labelId);
        const node = this.modelState.index.findSemanticElement(semanticId, isAstNode);
        if (!node) {
            return JSON.stringify([]);
        }
        // Labels that stand for a property of their own rather than for the element's name: the guard an
        // edge writes in brackets, and the property string either end of an association writes in braces.
        // Every other label on an edge is the name, which is what the rest of this method writes, so they
        // are told apart by what the label's id ends in.
        if (operation.labelId.endsWith(EDGE_GUARD_LABEL_SUFFIX)) {
            return JSON.stringify(this.buildGuardPatch(node, semanticId, operation.text));
        }
        if (operation.labelId.endsWith(EDGE_MODIFIERS_LABEL_SUFFIX)) {
            // Which end it belongs to is in the id as well: `<id>_source_modifiers_label`.
            const end = operation.labelId.endsWith(`_target${EDGE_MODIFIERS_LABEL_SUFFIX}`) ? 'target' : 'source';
            return JSON.stringify(this.buildPropertyPatch(node, semanticId, `${end}Modifiers`, storableModifiers(operation.text)));
        }

        // A note and a free label are the text they hold and have no name at all, so the one label each
        // carries stands for its `body`. Emptying it is refused rather than written through: either with
        // nothing in it is nothing on the canvas to see it by, and - since both are written by typing on
        // that label - nothing left to click to start writing in again.
        if (isNote(node) || isTextLabel(node)) {
            // `storableProse` rather than `storableText`: neither has notation to take back off, so a
            // bracket typed into one is a bracket and is kept - see the filter for what still cannot be.
            const body = storableProse(operation.text);
            return JSON.stringify(body === undefined ? [] : this.buildPropertyPatch(node, semanticId, 'body', body));
        }

        // The two elements labelled `trigger [guard] / effect` - a transition, and one line of a
        // state's second compartment. Their label is that notation rather than any one property, so
        // editing it writes all three parts at once.
        if (isTransition(node) || isStatePart(node)) {
            const basePath = this.modelState.index.findPath(semanticId);
            return JSON.stringify(
                basePath
                    ? behaviorLabelPatch(basePath, node as BehaviorLabelElement, operation.text, {
                          required: isStatePart(node),
                          // A transition writes its guard on a label of its own, so this one stands for the
                          // other two: it may still set a guard typed in brackets, but it never clears the
                          // one the guard label holds. One line of a state's compartment has no second label
                          // and stands for the whole notation.
                          parts: isTransition(node) ? TRANSITION_LABEL_PARTS : undefined
                      })
                    : []
            );
        }

        // The word a frame writes in the tag on its corner - the `ref` of an interaction use. Asked before
        // the reference line below, because both are labels of the same shape and the tag is not the line:
        // without this, retyping the tag would be read as retyping what the box stands for.
        //
        // Only where the element has somewhere to keep one, the way the stereotype below is asked: the
        // frames write a fixed keyword of their own on a label with this same suffix (`sd`, `interaction`),
        // and those are not editable - but a value written onto a type with no field for it goes into the
        // file under a rule that cannot read it back. Emptying it clears the property, and the tag then says
        // what it says by default again.
        if (operation.labelId.endsWith(KEYWORD_LABEL_SUFFIX) && 'keyword' in reflection.getTypeMetaData(node.$type).properties) {
            return JSON.stringify(this.buildPropertyPatch(node, semanticId, 'keyword', storableName(operation.text)));
        }

        // What is written in a `ref` box is its `interaction-use` - `Checkout`, `Login(usr, pwd)`,
        // `user = sc.Login(usr, pwd) : Boolean` - which is five properties rather than one, so typing on it
        // writes all five at once. The `=`, the `.`, the parentheses and the colon are notation and are
        // taken back off on the way in; a line that names no interaction clears all five, which is how the
        // box is emptied and is no different from clearing any other label - see `interactionUsePatch`.
        if (isInteractionUse(node)) {
            const basePath = this.modelState.index.findPath(semanticId);
            return JSON.stringify(basePath ? interactionUsePatch(basePath, node as InteractionUseElement, operation.text) : []);
        }

        // A state invariant is the condition written in it and carries no name, so its one label stands for
        // `invariant`. The braces the constraint notation writes it in come off by being unstorable rather
        // than by being matched, which is what makes one work for a user who retyped only one of the pair -
        // see `parseStateInvariant`. Emptying it is refused rather than written through: a shape with
        // nothing in it is nothing to read and nothing to double-click to start typing in again.
        if (isStateInvariant(node)) {
            const invariant = parseStateInvariant(operation.text);
            return JSON.stringify(invariant === undefined ? [] : this.buildPropertyPatch(node, semanticId, 'invariant', invariant));
        }

        // A stereotype, on whichever element was carrying one. Asked before anything about the element,
        // because it is the same thing said about all of them and it is never what that element's other
        // labels stand for - a lifeline's is its ident, a message's is its name.
        //
        // Only where the element actually has somewhere to put it: the relations write a fixed stereotype
        // of their own (`«dependency»`, `«flow»`) on a label with this same suffix, and those are not
        // editable - but a value written onto a type with no field for it goes into the file under a rule
        // that cannot read it back, so the grammar is asked rather than trusted, as `setConnectionPoint`
        // does. The guillemets come off by being unstorable rather than by being matched (see
        // `parseStereotype`), and emptying it clears the stereotype rather than storing an empty one.
        if (operation.labelId.endsWith(STEREOTYPE_LABEL_SUFFIX) && 'stereotype' in reflection.getTypeMetaData(node.$type).properties) {
            return JSON.stringify(this.buildPropertyPatch(node, semanticId, 'stereotype', parseStereotype(operation.text)));
        }

        // A duration constraint is the condition written beside its arrow and carries no name, so its one
        // label stands for `specification`. The braces come off by being unstorable rather than by being
        // matched - see `parseConstraint`, which is the same act the state invariant's braces go through.
        // Emptying it is refused: an arrow measuring something the reader is told nothing about says less
        // than no arrow at all, and there would be nothing left to double-click.
        if (isDurationConstraint(node)) {
            const specification = parseConstraint(operation.text);
            return JSON.stringify(
                specification === undefined ? [] : this.buildPropertyPatch(node, semanticId, 'specification', specification)
            );
        }

        // A lifeline's head is its `lifeline-ident` - `data : Stock`, `: User`, `x[k] : X`, `self` - which
        // is four properties rather than one, so typing on it writes all four at once. The colon and the
        // brackets are notation and are taken back off on the way in; an ident that came out empty is
        // refused, since a head with nothing in it says nothing about which participant it is.
        if (isLifeline(node)) {
            const basePath = this.modelState.index.findPath(semanticId);
            return JSON.stringify(basePath ? lifelineIdentPatch(basePath, node as LifelineIdentElement, operation.text) : []);
        }

        const prop = this.getLabelPropertyName(node);
        const path = this.modelState.index.findPath(semanticId) + '/' + prop;

        if (prop === 'name' && operation.text.trim().length === 0) {
            // InitialState is anonymous in UML, so clearing its name removes the property
            // entirely rather than persisting an empty string, which the grammar can't re-parse.
            if (isInitialState(node) && node.name !== undefined) {
                return JSON.stringify([{ op: 'remove' as const, path }]);
            }
            return JSON.stringify([]);
        }

        // Filtered rather than written as typed. A name is parsed as an identifier, so a bracket, a comma
        // or an accented letter in one is not stored badly - it is stored, the file is written, and the
        // next read of it fails. `[ok]` typed onto a control flow is what found this.
        //
        // Which filter, though, is a question about the grammar and is asked of it. A name the grammar
        // reads as free text holds everything that rule can lex, and a message's name is one of those:
        // what is written on the line is the operation the message calls, so `validate()` is stored with
        // its pair and drawn with it, `login(usr, pwd)` keeps its comma, and `Hello` is stored as the one
        // word it is - nothing here puts a pair of parentheses on a label that was typed without them.
        // See `hasTextName`, generated from the definitions so the filter cannot drift from the rule.
        const value =
            prop === 'name'
                ? hasTextName(node.$type)
                    ? storableProse(operation.text)
                    : storableName(operation.text)
                : // A label standing for some other property is filtered by that property's own rule, the
                  // way the property palette filters one - written through unfiltered, a `.` or a `(` typed
                  // onto a label whose property is parsed as a name goes into the file and the file then
                  // never opens again. `getLabelPropertyName` answers `name` for every element today, so
                  // this is the branch that keeps that from being a trap for the first one that does not.
                  isTextProperty(node.$type, prop)
                  ? storableText(operation.text)
                  : storableName(operation.text);
        if (value === undefined) {
            return JSON.stringify([]);
        }

        return JSON.stringify([
            {
                op: 'replace' as const,
                path,
                value
            }
        ]);
    }

    /**
     * Writes a guard typed on the line back onto the element, without the brackets it is written in -
     * which the user may well have retyped, and which cannot be stored in any case.
     *
     * Emptying it clears the guard rather than storing an empty string, which the grammar cannot
     * re-parse: `LangiumText` matches one token or more. A guard that was not set and was left empty is
     * no edit at all.
     */
    protected buildGuardPatch(node: AstNode, semanticId: string, text: string): LabelPatch[] {
        return this.buildPropertyPatch(node, semanticId, 'guard', storableGuard(text));
    }

    /**
     * Writes one property of an element from the label that stands for it, or clears it where the label
     * was emptied - a property the element does not carry and that was left empty is no edit at all.
     *
     * The value comes in already stripped of whatever the notation wraps it in, because that is what the
     * user retypes and what the grammar could not hold: it spells JSON structure out in keywords, and a
     * stored `[` or `{` leaves the model unparseable. An empty string is no more storable, which is why
     * clearing removes the property rather than writing one - `LangiumText` matches one token or more.
     */
    protected buildPropertyPatch(node: AstNode, semanticId: string, property: string, value: string | undefined): LabelPatch[] {
        const basePath = this.modelState.index.findPath(semanticId);
        if (!basePath) {
            return [];
        }

        const path = `${basePath}/${property}`;
        if (value !== undefined) {
            return [{ op: 'add', path, value }];
        }
        return (node as unknown as Record<string, unknown>)[property] !== undefined ? [{ op: 'remove', path }] : [];
    }
}
