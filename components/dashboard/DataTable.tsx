// DataTable — monospace-forward terminal-financier table.
//
// Opinionated styling: JetBrains Mono for amount/id cells, subtle zebra,
// hover lift, optional accent colour for the right-edge amount column.
// No internal sorting / paging — this is a presentational component.
// The parent owns data and filter state.

"use client";

import React from "react";
import zp from "@/lib/design-system/zenipay-brand";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  /** Align the cell contents. Defaults to "left". */
  align?: "left" | "right" | "center";
  /** Render with monospace font-family. Auto-true for amount columns. */
  mono?: boolean;
  /** Tight percentage width. */
  width?: number | string;
}

export interface DataTableProps<Row> {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string | number;
  onRowClick?: (row: Row) => void;
  striped?: boolean;
  empty?: React.ReactNode;
  loading?: boolean;
  minWidth?: number;
}

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  onRowClick,
  striped = true,
  empty,
  loading,
  minWidth = 640,
}: DataTableProps<Row>) {
  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 14,
              padding: "12px 0",
              borderBottom: i < 5 ? `1px solid ${zp.surface.border}` : "none",
            }}
          >
            <div style={{ width: 90, height: 12, background: zp.surface.bg3, borderRadius: 4 }} />
            <div style={{ flex: 1, height: 12, background: zp.surface.bg3, borderRadius: 4 }} />
            <div style={{ width: 110, height: 12, background: zp.surface.bg3, borderRadius: 4 }} />
            <div style={{ width: 90, height: 12, background: zp.surface.bg3, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "52px 20px",
          textAlign: "center" as const,
          color: zp.text.muted,
          fontSize: 13,
        }}
      >
        {empty ?? "No rows yet."}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth,
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? "left",
                  padding: "10px 16px",
                  fontSize: 10,
                  fontWeight: zp.weight.semibold,
                  color: zp.text.dim,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: zp.surface.bg2,
                  borderBottom: `1px solid ${zp.surface.border}`,
                  width: c.width,
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                cursor: onRowClick ? "pointer" : undefined,
                background: striped && i % 2 === 1 ? zp.surface.bg2 : "transparent",
                transition: zp.motion.fast,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = zp.surface.bg3;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background =
                  striped && i % 2 === 1 ? zp.surface.bg2 : "transparent";
              }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align ?? "left",
                    padding: "12px 16px",
                    fontFamily: c.mono ? zp.font.mono : zp.font.sans,
                    fontVariantNumeric: c.mono ? "tabular-nums" : undefined,
                    color: zp.text.primary,
                    borderBottom: `1px solid ${zp.surface.border}`,
                    verticalAlign: "middle",
                  }}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
