import React, {useRef, useState, useCallback, useEffect} from 'react';
import {DataTable, DataRelationship} from './data-schema';
import {useDraggable} from '@common/ui/interactions/dnd/use-draggable';
import {useDroppable} from '@common/ui/interactions/dnd/use-droppable';
import {Button} from '@common/ui/buttons/button';
import {IconButton} from '@common/ui/buttons/icon-button';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {DeleteIcon} from '@common/icons/material/Delete';
import {AddIcon} from '@common/icons/material/Add';
import {LinkIcon} from '@common/icons/material/Link';
import {TableChartIcon} from '@common/icons/material/TableChart';
import {AccountTreeIcon} from '@common/icons/material/AccountTree';
import {ZoomInIcon} from '@common/icons/material/ZoomIn';
import {ZoomOutIcon} from '@common/icons/material/ZoomOut';
import {CenterFocusStrongIcon} from '@common/icons/material/CenterFocusStrong';
import {AutoFixHighIcon} from '@common/icons/material/AutoFixHigh';
import clsx from 'clsx';

interface DatabaseDesignerProps {
  tables: DataTable[];
  relationships: DatabaseRelationship[];
  onAddTable: () => void;
  onEditTable: (table: DataTable) => void;
  onDeleteTable: (tableId: string) => void;
  onCreateRelationship: (relationship: Omit<DatabaseRelationship, 'id'>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  className?: string;
}

interface DatabaseRelationship {
  id: string;
  fromTable: string;
  toTable: string;
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';
  fromField?: string;
  toField?: string;
  label?: string;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

interface ConnectionState {
  isConnecting: boolean;
  fromTable: string | null;
  fromField: string | null;
  tempLine: {x1: number; y1: number; x2: number; y2: number} | null;
}

export function DatabaseDesigner({
  tables,
  relationships,
  onAddTable,
  onEditTable,
  onDeleteTable,
  onCreateRelationship,
  onDeleteRelationship,
  className
}: DatabaseDesignerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tablePositions, setTablePositions] = useState<TablePosition[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({x: 0, y: 0});
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    fromTable: null,
    fromField: null,
    tempLine: null
  });
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);

  // Initialize table positions
  useEffect(() => {
    if (tables.length > 0 && tablePositions.length === 0) {
      const positions = autoLayoutTables(tables);
      setTablePositions(positions);
    }
  }, [tables, tablePositions.length]);

  // Auto-layout tables in a grid
  const autoLayoutTables = (tables: DataTable[]): TablePosition[] => {
    const cols = Math.ceil(Math.sqrt(tables.length));
    const spacing = 300;
    
    return tables.map((table, index) => ({
      id: table.id,
      x: (index % cols) * spacing + 50,
      y: Math.floor(index / cols) * spacing + 50
    }));
  };

  const handleAutoLayout = () => {
    const positions = autoLayoutTables(tables);
    setTablePositions(positions);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({x: 0, y: 0});
  };

  const updateTablePosition = (tableId: string, x: number, y: number) => {
    setTablePositions(prev => 
      prev.map(pos => pos.id === tableId ? {...pos, x, y} : pos)
    );
  };

  const getTablePosition = (tableId: string) => {
    return tablePositions.find(pos => pos.id === tableId) || {x: 0, y: 0};
  };

  const startConnection = (tableId: string, fieldId?: string) => {
    const tablePos = getTablePosition(tableId);
    setConnectionState({
      isConnecting: true,
      fromTable: tableId,
      fromField: fieldId || null,
      tempLine: {
        x1: tablePos.x + 150, // Center of table
        y1: tablePos.y + 100,
        x2: tablePos.x + 150,
        y2: tablePos.y + 100
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectionState.isConnecting && connectionState.tempLine && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - panOffset.x) / zoom;
      const y = (e.clientY - rect.top - panOffset.y) / zoom;
      
      setConnectionState(prev => ({
        ...prev,
        tempLine: prev.tempLine ? {
          ...prev.tempLine,
          x2: x,
          y2: y
        } : null
      }));
    }
  };

  const completeConnection = (toTableId: string, toFieldId?: string) => {
    if (connectionState.isConnecting && connectionState.fromTable && connectionState.fromTable !== toTableId) {
      // Determine relationship type based on field types
      const relationshipType = determineRelationshipType(
        connectionState.fromTable,
        toTableId,
        connectionState.fromField,
        toFieldId
      );

      onCreateRelationship({
        fromTable: connectionState.fromTable,
        toTable: toTableId,
        type: relationshipType,
        fromField: connectionState.fromField || undefined,
        toField: toFieldId || undefined
      });
    }
    
    setConnectionState({
      isConnecting: false,
      fromTable: null,
      fromField: null,
      tempLine: null
    });
  };

  const determineRelationshipType = (
    fromTableId: string,
    toTableId: string,
    fromFieldId?: string | null,
    toFieldId?: string | null
  ): DatabaseRelationship['type'] => {
    // Simple heuristic - can be made more sophisticated
    if (fromFieldId && toFieldId) {
      return 'hasOne'; // Field-to-field connection
    }
    return 'hasMany'; // Table-to-table connection
  };

  const cancelConnection = () => {
    setConnectionState({
      isConnecting: false,
      fromTable: null,
      fromField: null,
      tempLine: null
    });
  };

  const getRelationshipColor = (type: DatabaseRelationship['type']) => {
    switch (type) {
      case 'hasOne': return '#10b981'; // Green
      case 'hasMany': return '#3b82f6'; // Blue  
      case 'belongsTo': return '#f59e0b'; // Orange
      case 'manyToMany': return '#8b5cf6'; // Purple
      default: return '#6b7280'; // Gray
    }
  };

  const getRelationshipLabel = (type: DatabaseRelationship['type']) => {
    switch (type) {
      case 'hasOne': return '1:1';
      case 'hasMany': return '1:N';
      case 'belongsTo': return 'N:1';
      case 'manyToMany': return 'N:N';
      default: return '';
    }
  };

  return (
    <div className={clsx('relative h-full w-full overflow-hidden bg-gray-50', className)}>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 rounded-lg bg-white p-2 shadow-lg">
        <Tooltip label="Add Table">
          <IconButton size="sm" variant="outline" onClick={onAddTable}>
            <AddIcon />
          </IconButton>
        </Tooltip>
        
        <div className="mx-2 h-6 w-px bg-gray-300" />
        
        <Tooltip label="Auto Layout">
          <IconButton size="sm" variant="outline" onClick={handleAutoLayout}>
            <AutoFixHighIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip label="Zoom In">
          <IconButton size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip label="Zoom Out">
          <IconButton size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip label="Reset View">
          <IconButton size="sm" variant="outline" onClick={handleResetView}>
            <CenterFocusStrongIcon />
          </IconButton>
        </Tooltip>
      </div>

      {/* Connection Mode Indicator */}
      {connectionState.isConnecting && (
        <div className="absolute top-4 right-4 z-10 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <LinkIcon size="sm" />
            <span className="text-sm font-medium">Click on a table to connect</span>
            <Button size="xs" variant="flat" color="white" onClick={cancelConnection}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onClick={connectionState.isConnecting ? cancelConnection : undefined}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
        }}
      >
        {/* SVG for relationship lines */}
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{zIndex: 1}}
        >
          {/* Relationship lines */}
          {relationships.map(relationship => {
            const fromPos = getTablePosition(relationship.fromTable);
            const toPos = getTablePosition(relationship.toTable);
            const color = getRelationshipColor(relationship.type);
            
            return (
              <g key={relationship.id}>
                <line
                  x1={fromPos.x + 150}
                  y1={fromPos.y + 100}
                  x2={toPos.x + 150}
                  y2={toPos.y + 100}
                  stroke={color}
                  strokeWidth={selectedRelationship === relationship.id ? 3 : 2}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => setSelectedRelationship(
                    selectedRelationship === relationship.id ? null : relationship.id
                  )}
                />
                {/* Relationship label */}
                <text
                  x={(fromPos.x + toPos.x) / 2 + 150}
                  y={(fromPos.y + toPos.y) / 2 + 95}
                  fill={color}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {getRelationshipLabel(relationship.type)}
                </text>
              </g>
            );
          })}
          
          {/* Temporary connection line */}
          {connectionState.tempLine && (
            <line
              x1={connectionState.tempLine.x1}
              y1={connectionState.tempLine.y1}
              x2={connectionState.tempLine.x2}
              y2={connectionState.tempLine.y2}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5,5"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Table components */}
        {tables.map(table => (
          <DatabaseTable
            key={table.id}
            table={table}
            position={getTablePosition(table.id)}
            isConnectionSource={connectionState.fromTable === table.id}
            onPositionChange={(x, y) => updateTablePosition(table.id, x, y)}
            onEdit={() => onEditTable(table)}
            onDelete={() => onDeleteTable(table.id)}
            onStartConnection={(fieldId) => startConnection(table.id, fieldId)}
            onCompleteConnection={(fieldId) => completeConnection(table.id, fieldId)}
            isConnecting={connectionState.isConnecting}
          />
        ))}
      </div>

      {/* Relationship details panel */}
      {selectedRelationship && (
        <div className="absolute bottom-4 right-4 z-10 w-80 rounded-lg bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Relationship Details</h3>
            <IconButton
              size="xs"
              onClick={() => onDeleteRelationship(selectedRelationship)}
              className="text-red-500 hover:text-red-700"
            >
              <DeleteIcon />
            </IconButton>
          </div>
          {(() => {
            const rel = relationships.find(r => r.id === selectedRelationship);
            if (!rel) return null;
            
            const fromTable = tables.find(t => t.id === rel.fromTable);
            const toTable = tables.find(t => t.id === rel.toTable);
            
            return (
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="font-medium">{fromTable?.displayName}</span>
                  <span className="mx-2 text-gray-500">→</span>
                  <span className="font-medium">{toTable?.displayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded"
                    style={{backgroundColor: getRelationshipColor(rel.type)}}
                  />
                  <span className="capitalize">{rel.type.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-gray-500">({getRelationshipLabel(rel.type)})</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty state */}
      {tables.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <TableChartIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">No tables yet</h3>
            <p className="mb-4 text-gray-500">
              Add your first table to start designing your database
            </p>
            <Button onClick={onAddTable} variant="flat">
              <AddIcon className="mr-2" />
              Add Table
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DatabaseTableProps {
  table: DataTable;
  position: {x: number; y: number};
  isConnectionSource: boolean;
  onPositionChange: (x: number, y: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartConnection: (fieldId?: string) => void;
  onCompleteConnection: (fieldId?: string) => void;
  isConnecting: boolean;
}

function DatabaseTable({
  table,
  position,
  isConnectionSource,
  onPositionChange,
  onEdit,
  onDelete,
  onStartConnection,
  onCompleteConnection,
  isConnecting
}: DatabaseTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {draggableProps} = useDraggable({
    id: `table-${table.id}`,
    type: 'database-table',
    ref,
    getData: () => ({ tableId: table.id, type: 'database-table' }),
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragMove: (e) => {
      onPositionChange(position.x + e.deltaX, position.y + e.deltaY);
    }
  });

  const {droppableProps} = useDroppable({
    id: `table-drop-${table.id}`,
    types: ['database-table'],
    ref
  });

  const handleTableClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting && !isConnectionSource) {
      onCompleteConnection();
    } else if (!isConnecting) {
      onEdit();
    }
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConnecting) {
      onStartConnection();
    }
  };

  const handleFieldConnectionClick = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting && !isConnectionSource) {
      onCompleteConnection(fieldId);
    } else if (!isConnecting) {
      onStartConnection(fieldId);
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        'absolute select-none rounded-lg bg-white shadow-lg transition-all',
        isDragging && 'scale-105 shadow-xl',
        isConnectionSource && 'ring-2 ring-blue-500',
        isConnecting && !isConnectionSource && 'cursor-pointer ring-2 ring-green-400 ring-opacity-50'
      )}
      style={{
        left: position.x,
        top: position.y,
        width: 300,
        zIndex: isDragging ? 10 : 2
      }}
      onClick={handleTableClick}
      {...draggableProps}
      {...droppableProps}
    >
      {/* Table header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <TableChartIcon className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-medium text-gray-900">{table.displayName}</h3>
            {table.description && (
              <p className="text-xs text-gray-500">{table.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Tooltip label="Create Relationship">
            <IconButton
              size="xs"
              variant="text"
              onClick={handleConnectionClick}
              className={clsx(
                'text-blue-500 hover:text-blue-700',
                isConnectionSource && 'bg-blue-100'
              )}
            >
              <LinkIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip label="Delete Table">
            <IconButton
              size="xs"
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-500 hover:text-red-700"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Table fields */}
      <div className="max-h-64 overflow-y-auto">
        {table.fields.slice(0, 10).map(field => (
          <div
            key={field.id}
            className={clsx(
              'flex items-center justify-between border-b border-gray-100 p-2 text-sm transition-colors',
              isConnecting && !isConnectionSource && 'hover:bg-green-50 cursor-pointer'
            )}
            onClick={(e) => handleFieldConnectionClick(field.id, e)}
          >
            <div className="flex items-center gap-2">
              <div className={clsx(
                'h-2 w-2 rounded-full',
                field.required ? 'bg-red-400' : 'bg-gray-300'
              )} />
              <span className="font-mono text-gray-900">{field.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {field.type}
              </span>
              {field.relationship && (
                <Tooltip label={`${field.relationship.type} → ${field.relationship.targetTable}`}>
                  <AccountTreeIcon className="h-3 w-3 text-blue-500" />
                </Tooltip>
              )}
            </div>
          </div>
        ))}
        
        {table.fields.length > 10 && (
          <div className="p-2 text-center text-xs text-gray-500">
            +{table.fields.length - 10} more fields
          </div>
        )}
      </div>
    </div>
  );
}