import { useEffect, useMemo, useState } from 'react';
import { Box, Tab, Tabs, Typography, CircularProgress } from '@mui/material';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { parseSpreadsheet, columnLabel, type SpreadsheetData } from '../../utils/spreadsheet';
import { FilePreviewCard, fileExtBadge } from './FilePreviewCard';

const FULL_MAX_ROWS = 500;
const FULL_MAX_COLS = 52;
const THUMB_MAX_ROWS = 5;
const THUMB_MAX_COLS = 4;
const ROW_HEADER_W = 46;
const COL_HEADER_H = 28;
const CELL_W = 100;
const CELL_H = 26;

const SHEETS_GREEN = '#0f9d58';
const SHEETS_HEADER_BG = '#f8f9fa';
const SHEETS_BORDER = '#e0e0e0';

type Props = {
  blob: Blob;
  filename: string;
  compact?: boolean;
  onLoaded?: () => void;
  onError?: (msg: string) => void;
};

function normalizeRows(rows: string[][], maxRows: number, maxCols: number) {
  const sliced = rows.slice(0, maxRows);
  const colCount = Math.max(1, ...sliced.map((r) => r.length));
  const clampedCols = Math.min(colCount, maxCols);
  return sliced.map((row) => {
    const cells = row.slice(0, clampedCols).map((c) => (c == null ? '' : String(c)));
    while (cells.length < clampedCols) cells.push('');
    return cells;
  });
}

function FullGrid({
  rows,
  truncated,
}: {
  rows: string[][];
  truncated?: boolean;
}) {
  const colCount = rows[0]?.length ?? 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {truncated && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, py: 0.5, bgcolor: '#fff8e1', borderBottom: '1px solid #f0e6b2' }}>
          Showing a preview of the first {FULL_MAX_ROWS} rows and {FULL_MAX_COLS} columns.
        </Typography>
      )}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: '#fff',
          '&::-webkit-scrollbar': { width: 8, height: 8 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#c1c1c1', borderRadius: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: '#f1f1f1' },
        }}
      >
        <Box sx={{ display: 'inline-block', minWidth: '100%' }}>
          <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3 }}>
            <Box
              sx={{
                width: ROW_HEADER_W,
                minWidth: ROW_HEADER_W,
                height: COL_HEADER_H,
                bgcolor: '#f3f3f3',
                borderRight: '1px solid #c4c7c5',
                borderBottom: '1px solid #c4c7c5',
                position: 'sticky',
                left: 0,
                zIndex: 4,
              }}
            />
            {Array.from({ length: colCount }, (_, ci) => (
              <Box
                key={ci}
                sx={{
                  width: CELL_W,
                  minWidth: CELL_W,
                  height: COL_HEADER_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f3f3f3',
                  borderRight: '1px solid #c4c7c5',
                  borderBottom: '1px solid #c4c7c5',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#444746',
                  userSelect: 'none',
                }}
              >
                {columnLabel(ci)}
              </Box>
            ))}
          </Box>

          {rows.map((row, ri) => (
            <Box key={ri} sx={{ display: 'flex' }}>
              <Box
                sx={{
                  width: ROW_HEADER_W,
                  minWidth: ROW_HEADER_W,
                  height: CELL_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f3f3f3',
                  borderRight: '1px solid #c4c7c5',
                  borderBottom: '1px solid #e0e0e0',
                  fontSize: 12,
                  color: '#444746',
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  userSelect: 'none',
                }}
              >
                {ri + 1}
              </Box>
              {row.map((cell, ci) => (
                <Box
                  key={ci}
                  sx={{
                    width: CELL_W,
                    minWidth: CELL_W,
                    height: CELL_H,
                    px: 1,
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0',
                    fontSize: 13,
                    color: '#1f1f1f',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    bgcolor: '#fff',
                  }}
                  title={cell}
                >
                  {cell}
                </Box>
              ))}
            </Box>
          ))}

          {rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              This sheet is empty.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function ThumbGrid({ rows }: { rows: string[][] }) {
  if (rows.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff' }}>
        <Typography variant="caption" color="text.secondary">Empty sheet</Typography>
      </Box>
    );
  }

  const [header, ...body] = rows;

  return (
    <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
      {header && (
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${SHEETS_BORDER}`, flexShrink: 0 }}>
          {header.map((cell, ci) => (
            <Box
              key={ci}
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1,
                py: 0.6,
                fontSize: 10.5,
                fontWeight: 600,
                color: '#3c4043',
                bgcolor: SHEETS_HEADER_BG,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderRight: ci < header.length - 1 ? `1px solid ${SHEETS_BORDER}` : 'none',
              }}
              title={cell}
            >
              {cell || columnLabel(ci)}
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {body.map((row, ri) => (
          <Box
            key={ri}
            sx={{
              display: 'flex',
              borderBottom: ri < body.length - 1 ? `1px solid ${SHEETS_BORDER}` : 'none',
              bgcolor: ri % 2 === 0 ? '#fff' : '#fafafa',
            }}
          >
            {row.map((cell, ci) => (
              <Box
                key={ci}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  px: 1,
                  py: 0.55,
                  fontSize: 10.5,
                  color: '#5f6368',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderRight: ci < row.length - 1 ? `1px solid ${SHEETS_BORDER}` : 'none',
                }}
                title={cell}
              >
                {cell}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function SpreadsheetViewer({ blob, filename, compact, onLoaded, onError }: Props) {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveSheet(0);

    parseSpreadsheet(blob, filename)
      .then((parsed) => {
        if (cancelled) return;
        setData(parsed);
        onLoaded?.();
      })
      .catch(() => {
        if (cancelled) return;
        const msg = 'Could not read spreadsheet';
        setError(msg);
        onError?.(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [blob, filename, onLoaded, onError]);

  const sheet = data?.sheets[activeSheet];
  const { displayRows, truncated } = useMemo(() => {
    if (!sheet) return { displayRows: [], truncated: false };
    const rawRows = sheet.rows;
    const maxRows = compact ? THUMB_MAX_ROWS : FULL_MAX_ROWS;
    const maxCols = compact ? THUMB_MAX_COLS : FULL_MAX_COLS;
    const truncatedRows = rawRows.length > maxRows;
    const maxRawCols = Math.max(0, ...rawRows.map((r) => r.length));
    const truncatedCols = maxRawCols > maxCols;
    return {
      displayRows: normalizeRows(rawRows, maxRows, maxCols),
      truncated: truncatedRows || truncatedCols,
    };
  }, [sheet, compact]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: compact ? 4 : 8 }}>
        <CircularProgress size={compact ? 24 : 32} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: compact ? 3 : 6 }}>
        {error ?? 'Could not load spreadsheet'}
      </Typography>
    );
  }

  if (compact) {
    return <ThumbGrid rows={displayRows} />;
  }

  const showTabs = data.sheets.length > 1;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        minHeight: 320,
        border: '1px solid #dadce0',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <FullGrid rows={displayRows} truncated={truncated} />
      </Box>

      {showTabs && (
        <Box sx={{ borderTop: '1px solid #dadce0', bgcolor: '#e8eaed', flexShrink: 0 }}>
          <Tabs
            value={activeSheet}
            onChange={(_, v) => setActiveSheet(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTabs-indicator': { bgcolor: SHEETS_GREEN, height: 3 },
              '& .MuiTab-root': {
                minHeight: 36,
                py: 0.5,
                px: 2,
                fontSize: 13,
                textTransform: 'none',
                color: '#444746',
                bgcolor: '#e8eaed',
                borderRight: '1px solid #dadce0',
                '&.Mui-selected': { bgcolor: '#fff', color: SHEETS_GREEN, fontWeight: 600 },
              },
            }}
          >
            {data.sheets.map((s, i) => (
              <Tab key={s.name} label={s.name} value={i} />
            ))}
          </Tabs>
        </Box>
      )}
    </Box>
  );
}

export function SpreadsheetThumbnail({
  blob,
  filename,
  onClick,
}: {
  blob: Blob;
  filename: string;
  onClick?: () => void;
}) {
  return (
    <FilePreviewCard
      filename={filename}
      accentColor={SHEETS_GREEN}
      icon={<TableChartOutlinedIcon />}
      badge={fileExtBadge(filename, 'SHEET')}
      onClick={onClick}
    >
      <Box sx={{ position: 'relative', height: '100%' }}>
        <SpreadsheetViewer blob={blob} filename={filename} compact />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.95))',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </FilePreviewCard>
  );
}
