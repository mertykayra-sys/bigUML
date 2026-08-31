/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { type Declaration, Decorator, type Property } from '@borkdominik-biguml/uml-language-tooling';
import { Eta } from 'eta';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eta = new Eta({ views: path.join(__dirname, '..', 'templates') });

// ============================================================================
// Types
// ============================================================================

interface DefaultMappingEntry {
    property: string;
    propertyType: string;
    defaultValue?: Property['defaultValue'];
}

type DefaultMapping = Record<string, DefaultMappingEntry[]>;

// ============================================================================
// Main entry point
// ============================================================================

export function renderDefaultValue(extensionPath: string, declarations: Declaration[]): { path: string; content: string }[] {
    const payload = buildDefaultValueMapping(declarations);
    const content = eta.render('./get-default-value', payload);

    return [
        {
            path: path.join(extensionPath, 'vscode', 'get-default-value.ts'),
            content
        }
    ];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * The names of every property this declaration is parsed with `LangiumText`, its supertypes' included.
 *
 * Walked rather than read off the declaration alone: a property declared on a base class is emitted into
 * the rule of every class that extends it, so it is one of that class's properties as far as the grammar -
 * and as far as anything asking what may be stored in it - is concerned.
 */
function textPropertiesOf(decl: Declaration, declarations: Declaration[], seen = new Set<string>()): string[] {
    if (!decl.name || seen.has(decl.name)) {
        return [];
    }
    seen.add(decl.name);

    const own = (decl.properties ?? []).filter(prop => Decorator.has(prop.decorators, 'text')).map(prop => prop.name);
    const inherited = (decl.extends ?? []).flatMap(base => {
        const parent = declarations.find(d => d.type === 'class' && d.name === base);
        return parent ? textPropertiesOf(parent, declarations, seen) : [];
    });

    return Array.from(new Set([...own, ...inherited]));
}

function buildDefaultValueMapping(declarations: Declaration[]): {
    defaultMapping: DefaultMapping;
    noBoundsClasses: string[];
    optionalNameClasses: string[];
    textProperties: Record<string, string[]>;
    unnamedClasses: string[];
    astTypeMap: Record<string, string>;
} {
    const mapping: DefaultMapping = {};
    const noBoundsClasses: string[] = [];
    const optionalNameClasses: string[] = [];
    const textProperties: Record<string, string[]> = {};
    const unnamedClasses: string[] = [];
    const astTypeMap: Record<string, string> = {};

    for (const decl of declarations) {
        if (Decorator.has(decl.decorators, 'noBounds')) {
            noBoundsClasses.push(decl.name!);
        }

        const aliasDec = Decorator.find(decl.decorators, 'alias');
        if (aliasDec) {
            const value = Decorator.getArg<string>(aliasDec);
            if (value) {
                astTypeMap[decl.name!.toLowerCase()] = value;
            }
        }

        if (decl.type !== 'class' || !decl.name || !decl.properties) {
            continue;
        }

        // Whether the grammar can write this element without a name at all. A name declared `name?`
        // becomes an optional assignment, which is the only case where clearing one can be stored -
        // there is no way to write an empty name, since `LangiumText` needs at least one token.
        if (decl.properties.some(prop => prop.name === 'name' && prop.isOptional)) {
            optionalNameClasses.push(decl.name);
        }

        // Which of this element's properties the grammar reads as free text (`LangiumText`) rather than as
        // a name (`LangiumName`) - the ones marked `@Language.text`, because what is written in them is an
        // expression or prose rather than a bare name.
        //
        // The two rules take different characters, and which one a property is parsed with is the whole of
        // what may be stored in it: a value the rule cannot lex is not refused, it is written to the file
        // and the file then never opens again. So the filter a typed value goes through follows from this
        // (see `storableName`, `storableText`) and is read off the definitions rather than listed a second
        // time by hand, where the two could drift apart - which is exactly how a `.` typed into a message's
        // stereotype came to be storable and unreadable.
        //
        // Inherited properties are collected too, because the rules carry them: an element is parsed with
        // everything its supertypes declare as well as its own.
        const text = textPropertiesOf(decl, declarations);
        if (text.length > 0) {
            textProperties[decl.name] = text;
        }

        // Whether the element has no name to write at all - a note, which is the text it holds and has
        // nothing else to be called. Taken from the declared properties rather than from the mapping
        // below, which drops an optional property that carries no default and so cannot tell a class
        // with no name from one whose name is simply not defaulted.
        if (!decl.properties.some(prop => prop.name === 'name')) {
            unnamedClasses.push(decl.name);
        }

        const withDefaultAll = Decorator.has(decl.decorators, 'defaults');
        const seen = new Set<string>();
        const entries: DefaultMappingEntry[] = [];

        for (const prop of decl.properties) {
            if (seen.has(prop.name)) {
                continue;
            }
            seen.add(prop.name);

            if (!withDefaultAll && prop.isOptional && prop.defaultValue === undefined) {
                continue;
            }

            const firstType = prop.types[0];
            if (!firstType) {
                continue;
            }

            const entry: DefaultMappingEntry = {
                property: prop.name,
                propertyType: firstType.typeName
            };
            if (prop.defaultValue !== undefined) {
                entry.defaultValue = prop.defaultValue;
            }

            entries.push(entry);
        }

        mapping[decl.name] = entries;
    }

    return {
        defaultMapping: mapping,
        noBoundsClasses,
        optionalNameClasses,
        textProperties,
        unnamedClasses,
        astTypeMap
    };
}
