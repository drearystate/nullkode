import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {
  getAutomationData,
  saveAutomationData,
  saveTrigger,
  saveDataTable,
  deleteDataTable,
  saveDataBinding,
  saveExternalConnection,
  testConnection,
  setupAutomationDatabase,
  AutomationData,
  TriggerData,
  DataTableSchema,
  DataBinding,
  ExternalConnection,
} from '@app/projects/automation-api';
import {useEditorStore} from '@app/editor/state/editor-store';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';

export function useAutomationData() {
  const projectId = useEditorStore(s => s.project?.model?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['automation', projectId],
    queryFn: () => getAutomationData(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const saveAutomation = useMutation({
    mutationFn: (automation: AutomationData) => 
      saveAutomationData(projectId!, automation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Automation data saved successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to save automation data: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const addTrigger = useMutation({
    mutationFn: (trigger: TriggerData) => saveTrigger(projectId!, trigger),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Trigger saved successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to save trigger: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const addDataTable = useMutation({
    mutationFn: (table: DataTableSchema) => saveDataTable(projectId!, table),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Data table created successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to create data table: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const deleteDataTableMutation = useMutation({
    mutationFn: (tableId: string) => deleteDataTable(projectId!, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Data table deleted successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to delete data table: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const addDataBinding = useMutation({
    mutationFn: (binding: DataBinding) => saveDataBinding(projectId!, binding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Data binding created successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to create data binding: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const addConnection = useMutation({
    mutationFn: (connection: ExternalConnection) => 
      saveExternalConnection(projectId!, connection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('External connection saved successfully'));
    },
    onError: (error: any) => {
      toast(message('Failed to save connection: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const testExternalConnection = useMutation({
    mutationFn: ({ type, config }: { type: string; config: any }) =>
      testConnection(projectId!, type, config),
    onError: (error: any) => {
      toast(message('Connection test failed: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  const setupDatabase = useMutation({
    mutationFn: () => setupAutomationDatabase(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', projectId] });
      toast(message('Automation database setup completed'));
    },
    onError: (error: any) => {
      toast(message('Failed to setup database: :error', {
        values: { error: error?.message || 'Unknown error' }
      }));
    },
  });

  return {
    data: query.data?.automation,
    isLoading: query.isLoading,
    error: query.error,
    saveAutomation: saveAutomation.mutate,
    isSaving: saveAutomation.isPending,
    addTrigger: addTrigger.mutate,
    isAddingTrigger: addTrigger.isPending,
    addDataTable: addDataTable.mutate,
    isAddingTable: addDataTable.isPending,
    deleteDataTable: deleteDataTableMutation.mutate,
    isDeletingTable: deleteDataTableMutation.isPending,
    addDataBinding: addDataBinding.mutate,
    isAddingBinding: addDataBinding.isPending,
    addConnection: addConnection.mutate,
    isAddingConnection: addConnection.isPending,
    testConnection: testExternalConnection.mutate,
    isTestingConnection: testExternalConnection.isPending,
    connectionTestResult: testExternalConnection.data?.result,
    setupDatabase: setupDatabase.mutate,
    isSettingUpDatabase: setupDatabase.isPending,
  };
}

export function useAutomationStats() {
  const { data } = useAutomationData();
  
  return {
    triggerCount: data?.triggers?.length || 0,
    tableCount: data?.dataSchema?.length || 0,
    bindingCount: data?.bindings?.length || 0,
    connectionCount: data?.externalConnections?.length || 0,
    hasAutomation: 
      (data?.triggers?.length || 0) > 0 || 
      (data?.bindings?.length || 0) > 0 ||
      (data?.externalConnections?.length || 0) > 0,
  };
} 