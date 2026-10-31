import { useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InfoCallout,
  PageIntro,
} from '../components/ui';
import {
  downloadCsvTemplate,
  EXPECTED_EVENT_FIELDS,
  EXPECTED_LOGIN_FIELDS,
  parseCsv,
} from '../utils/csv';
import { formatNumber } from '../utils/format';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Ingestion() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [validation, setValidation] = useState(null);

  async function handleFile(file) {
    if (!file) return;

    setFileInfo(null);
    setValidation(null);

    const errors = [];

    if (!file.name.toLowerCase().endsWith('.csv')) {
      errors.push('The selected file must use the .csv extension.');
    }
    if (file.size === 0) {
      errors.push('The selected file is empty.');
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push('The selected file is larger than the 5 MB local preview limit.');
    }

    if (errors.length) {
      setValidation({ type: 'error', messages: errors });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.headers.length) {
        setValidation({
          type: 'error',
          messages: ['No CSV header row could be detected in this file.'],
        });
        return;
      }

      if (!parsed.rows.length) {
        setValidation({
          type: 'error',
          messages: ['The CSV contains a header row but no data records.'],
        });
        return;
      }

      setFileInfo({
        name: file.name,
        size: file.size,
        headers: parsed.headers,
        rows: parsed.rows,
        missingFields: parsed.missingFields,
      });
      setValidation({
        type: 'success',
        messages: [
          `${formatNumber(parsed.rows.length)} record${
            parsed.rows.length === 1 ? '' : 's'
          } parsed locally.`,
        ],
      });
    } catch (error) {
      setValidation({
        type: 'error',
        messages: [`The file could not be read: ${error.message}`],
      });
    }
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  }

  function clearFile() {
    setFileInfo(null);
    setValidation(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="page-stack">
      <PageIntro
        description="Prepare and inspect event data before analysis."
        eyebrow="Data preparation"
        title="Event Ingestion"
        actions={
          <Button icon="download" onClick={downloadCsvTemplate} variant="secondary">
            Download CSV template
          </Button>
        }
      />

      <InfoCallout
        icon="info"
        title="CSV upload is currently a local preview only"
        tone="warning"
      >
        <p>
          The backend does not expose a CSV ingestion endpoint. Files selected here
          are parsed in your browser for preview and are <strong>not uploaded</strong>,
          stored, or analyzed. No upload status is simulated.
        </p>
      </InfoCallout>

      <div className="grid grid--ingest">
        <Card>
          <CardHeader
            icon="upload"
            subtitle="Drag a CSV file here or use Browse Files to validate it locally."
            title="CSV File Preview"
          />

          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDrop={handleDrop}
          >
            <span className="dropzone__icon">
              <Icon name="file" size={30} />
            </span>
            <h3>Drop a CSV file to inspect it</h3>
            <p>
              The file never leaves this browser. Preview limit: 5 MB. Supported
              extension: <span className="mono">.csv</span>
            </p>
            <div className="dropzone__actions">
              <Button
                icon="upload"
                onClick={() => inputRef.current?.click()}
                variant="primary"
              >
                Browse Files
              </Button>
              <input
                accept=".csv,text/csv"
                className="visually-hidden"
                onChange={handleInputChange}
                ref={inputRef}
                type="file"
              />
              {fileInfo ? (
                <Button icon="close" onClick={clearFile} variant="ghost">
                  Clear preview
                </Button>
              ) : null}
            </div>
          </div>

          {validation ? (
            <div
              className={`inline-alert inline-alert--${validation.type}`}
              role={validation.type === 'error' ? 'alert' : 'status'}
            >
              <Icon
                name={validation.type === 'error' ? 'xCircle' : 'checkCircle'}
                size={18}
              />
              <div>
                {validation.messages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>
          ) : null}

          {fileInfo ? (
            <div className="file-summary">
              <div className="file-summary__main">
                <span className="file-summary__icon">
                  <Icon name="file" size={19} />
                </span>
                <div>
                  <strong>{fileInfo.name}</strong>
                  <span>
                    {formatFileSize(fileInfo.size)} ·{' '}
                    {formatNumber(fileInfo.rows.length)} records ·{' '}
                    {fileInfo.headers.length} columns
                  </span>
                </div>
              </div>
              <div className="file-summary__badges">
                <Badge tone="info">Local preview</Badge>
                <Badge tone="neutral">Not uploaded</Badge>
                <Badge tone="pending">Analysis: not submitted</Badge>
              </div>
            </div>
          ) : null}

          {fileInfo?.missingFields?.length ? (
            <p className="section-note">
              These backend-recognized fields were not found in the CSV header:{' '}
              <span className="mono">{fileInfo.missingFields.join(', ')}</span>.
              The file can still be previewed, but it may not match a supported
              event schema.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            icon="scan"
            subtitle="Field names recognized by the existing backend schemas."
            title="Supported Fields"
          />
          <div className="field-group">
            <h3>Event analysis</h3>
            <p>Used by POST /api/analyze and POST /api/simulate.</p>
            <div className="field-chips">
              {EXPECTED_EVENT_FIELDS.map((field) => (
                <code key={field}>{field}</code>
              ))}
            </div>
          </div>
          <div className="field-group">
            <h3>Login events</h3>
            <p>Used by POST /api/login-event.</p>
            <div className="field-chips">
              {EXPECTED_LOGIN_FIELDS.map((field) => (
                <code key={field}>{field}</code>
              ))}
            </div>
          </div>
          <div className="field-group">
            <h3>Local validation rules</h3>
            <ul className="compact-list">
              <li>Extension must be .csv.</li>
              <li>File must not be empty.</li>
              <li>Maximum preview size is 5 MB.</li>
              <li>A header row and at least one data row are required.</li>
            </ul>
          </div>
          <Button
            className="button-block"
            icon="download"
            onClick={downloadCsvTemplate}
            variant="secondary"
          >
            Download example template
          </Button>
        </Card>
      </div>

      <Card padded={false}>
        <div className="card-padded-header">
          <CardHeader
            actions={
              fileInfo ? (
                <Badge tone="info">
                  Showing first {formatNumber(Math.min(fileInfo.rows.length, 100))} of{' '}
                  {formatNumber(fileInfo.rows.length)}
                </Badge>
              ) : null
            }
            icon="activity"
            subtitle="Parsed locally from the selected file. No data has been submitted."
            title="Event Preview"
          />
        </div>

        {fileInfo ? (
          <div className="table-wrap table-wrap--tall">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="row-number">#</th>
                  {fileInfo.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileInfo.rows.slice(0, 100).map((row, index) => (
                  <tr key={`row-${index}`}>
                    <td className="row-number">{index + 1}</td>
                    {fileInfo.headers.map((header) => (
                      <td key={`${header}-${index}`}>
                        {row[header] === '' ? (
                          <span className="text-dim">—</span>
                        ) : (
                          row[header]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-padded">
            <EmptyState
              description="Select a CSV file to preview its columns and records here."
              icon="file"
              title="No file selected"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
