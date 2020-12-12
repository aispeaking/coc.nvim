import { DocumentSymbol, Range, MarkupContent, MarkupKind, SymbolInformation } from 'vscode-languageserver-protocol'
import Document from '../model/document'
import { Documentation } from '../types'
import { wait } from '../util'
import { getSymbolKind } from '../util/convert'

export interface SymbolInfo {
  filepath?: string
  lnum: number
  col: number
  text: string
  kind: string
  level?: number
  containerName?: string
  range: Range
  selectionRange?: Range
}

export function getPreviousContainer(containerName: string, symbols: SymbolInfo[]): SymbolInfo {
  if (!symbols.length)
    return null
  let i = symbols.length - 1
  let last = symbols[i]
  if (last.text == containerName) {
    return last
  }
  while (i >= 0) {
    let sym = symbols[i]
    if (sym.text == containerName) {
      return sym
    }
    i--
  }
  return null
}

export function sortDocumentSymbols(a: DocumentSymbol, b: DocumentSymbol): number {
  let ra = a.selectionRange
  let rb = b.selectionRange
  if (ra.start.line < rb.start.line) {
    return -1
  }
  if (ra.start.line > rb.start.line) {
    return 1
  }
  return ra.start.character - rb.start.character
}

export function addDoucmentSymbol(res: SymbolInfo[], sym: DocumentSymbol, level: number): void {
  let { name, selectionRange, kind, children, range } = sym
  let { start } = selectionRange
  res.push({
    col: start.character + 1,
    lnum: start.line + 1,
    text: name,
    level,
    kind: getSymbolKind(kind),
    range,
    selectionRange
  })
  if (children && children.length) {
    children.sort(sortDocumentSymbols)
    for (let sym of children) {
      addDoucmentSymbol(res, sym, level + 1)
    }
  }
}

export function sortSymbolInformations(a: SymbolInformation, b: SymbolInformation): number {
  let sa = a.location.range.start
  let sb = b.location.range.start
  let d = sa.line - sb.line
  return d == 0 ? sa.character - sb.character : d

}

function isDocumentSymbol(a: DocumentSymbol | SymbolInformation): a is DocumentSymbol {
  return a && !a.hasOwnProperty('location')
}

export function isDocumentSymbols(a: DocumentSymbol[] | SymbolInformation[]): a is DocumentSymbol[] {
  return isDocumentSymbol(a[0])
}

export function isMarkdown(content: MarkupContent | string | undefined): boolean {
  if (MarkupContent.is(content) && content.kind == MarkupKind.Markdown) {
    return true
  }
  return false
}

export function addDocument(docs: Documentation[], text: string, filetype: string, isPreview = false): void {
  let content = text.trim()
  if (!content.length)
    return
  if (isPreview && filetype !== 'markdown') {
    content = '``` ' + filetype + '\n' + content + '\n```'
  }
  docs.push({ content, filetype })
}

export async function synchronizeDocument(doc: Document): Promise<void> {
  let { changedtick } = doc
  await doc.patchChange()
  if (changedtick != doc.changedtick) {
    await wait(50)
  }
}