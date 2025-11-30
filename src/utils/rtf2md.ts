/*
    Most of the code in this file was copied and adapted from the [rtf2md commandline tool](https://github.com/aredridel/rtf2md).
*/
import { Heading, Paragraph, PhrasingContent, Root, ThematicBreak } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import * as NodeFS from "node:fs";
import { DataWriteOptions, TFile } from "obsidian";
import * as RtfNS from 'rtf-parser';
import { promisify } from 'util';

const rtfParser = promisify(RtfNS.stream);

/**
 * Converts RTF into Markdown.
 * @param input A readable stream of the RTF file
 * @param vaultFile The Obsidian file to write the markdown to
 * @param options The optional writing options
 */
export default async function rtf2md(input: NodeFS.ReadStream, vaultFile: TFile, options?: DataWriteOptions): Promise<void> {
    const rtf = await rtfParser(input);

    const mdtree = rtf2mdtree(rtf);

    const md = toMarkdown(mdtree);

    await vaultFile.vault.append(vaultFile, md, options);
}

type MainTree = Paragraph | ThematicBreak | Heading;

function removeDuplicateQuotationSpans(spans: any[]) {
  // defines the characters that may appear in two consecutive spans
  const chars: string[] = ['\u2019', '\u201c', '\u201d']

  // don't bother if the array is empty
  if (!spans.length) {
    return;
  }

  // iterate from the last to the second item
  for (let idx = spans.length - 1; idx > 0; idx--) {
    const curValue: string = spans[idx].value;
    // if current span equals to one of the characters AND the previous span does as well, remove it
    if (chars.indexOf(curValue) >= 0 && spans[idx - 1].value == curValue) {
      spans.splice(idx, 1);
    }
  }

  return;
}

function rtf2mdtree(rtf: any): Root {
  let out: MainTree[] = [];

  let inScrivenerAnnotation = false;

  let pendingFreeSpans = [];
  for (const node of rtf.content) {
    if (node.constructor.name == "RTFSpan") {
      node.value = node.value.replace(/<!?[$]Scr[^>]+>/g, "");
      pendingFreeSpans.push(node);
    } else {
      removeDuplicateQuotationSpans(pendingFreeSpans);
      if (pendingFreeSpans.length) {
        out.push({
          type: "paragraph",
          children: pendingFreeSpans.map(span2md),
        });
        pendingFreeSpans = [];
      }

      for (const span of node.content) {
        span.value = span.value.replace(/<!?[$]Scr[^>]+>/g, "");
      }

      let scrivStart = inScrivenerAnnotation
        ? 0
        : node.content.findIndex((span: any) =>
            span.value.includes("{\\Scrv_annot")
          );
      if (scrivStart != -1) {
        inScrivenerAnnotation = true;
      }

      if (inScrivenerAnnotation) {
        let scrivEnd = node.content.findIndex((span: any) =>
          span.value.includes("\\end_Scrv_annot}")
        );
        if (scrivEnd == -1) {
          scrivEnd = node.content.length;
        } else {
          inScrivenerAnnotation = false;
        }

        node.content.splice(scrivStart, scrivEnd - scrivStart + 1);
      }

      if (node.content.length) {
        removeDuplicateQuotationSpans(node.content);
      }

      if (!node.content.length) continue;

      out.push(
        Object.assign(
          rtf.style.fontSize && node.style.fontSize - rtf.style.fontSize > 8
            ? {
                type: "heading",
                depth: 1,
              } as Heading
            : { type: "paragraph" } as Paragraph,
          {
            children: node.content.map(span2md),
          }
        )
      );
    }
  }

  removeDuplicateQuotationSpans(pendingFreeSpans);
  if (pendingFreeSpans.length) {
    out.push({
      type: "paragraph",
      children: pendingFreeSpans.map(span2md),
    });
  }

  return { type: "root", children: out } as Root;
}

type StyleTypes = 'emphasis' | 'strong' | 'delete';

function span2md(span: any) {
  const nesting: StyleTypes[] = [];
  const cleanedValue = span.value.replace(/’’/g, "\u2019");
  if (cleanedValue) {
    if (span.style.italic || span.style.underline) {
      nesting.push("emphasis");
    }
    if (span.style.bold) {
      nesting.push("strong");
    }
    if (span.style.strikethrough) {
      nesting.push("delete");
    }
  }

  let node: PhrasingContent = { type: "text", value: cleanedValue };

  for (const t of nesting) {
    node = { type: t, children: [node] };
  }

  return node;
}