import {useEffect, useRef} from 'react';
import {useSaveEditorProject} from '@app/editor/use-save-editor-project';
import {useMutationStore} from '@app/editor/state/mutation-store';
import {useParams} from 'react-router-dom';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';

export function useAutoSaveEditorProject() {
  const {projectId} = useParams();
  const saveProject = useSaveEditorProject();
  const isDirty = useMutationStore(s => s.isDirty);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());
  const isAutoSavingRef = useRef(false);

  useEffect(() => {
    // Only set up auto-save if we have a project ID
    if (!projectId) return;

    // Auto-save function
    const performAutoSave = async () => {
      // Don't auto-save if:
      // - Project is not dirty
      // - Manual save is in progress
      // - Auto-save is already in progress
      // - Less than 30 seconds have passed since last save
      if (
        !isDirty || 
        saveProject.isPending || 
        isAutoSavingRef.current ||
        (Date.now() - lastSaveTimeRef.current) < 30000
      ) {
        return;
      }

      try {
        isAutoSavingRef.current = true;
        
        await saveProject.mutateAsync(undefined, {
          onSuccess: () => {
            lastSaveTimeRef.current = Date.now();
            // Show subtle auto-save success notification
            toast(message('Auto-saved'), {
              type: 'positive',
              duration: 2000
            });
          }
        });
      } catch (error) {
        // Don't show error toast for auto-save failures to avoid spam
        console.warn('Auto-save failed:', error);
      } finally {
        isAutoSavingRef.current = false;
      }
    };

    // Set up interval for auto-save every 30 seconds
    autoSaveIntervalRef.current = setInterval(() => {
      performAutoSave();
    }, 30000); // 30 seconds

    // Cleanup interval on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [projectId, isDirty, saveProject, lastSaveTimeRef]);

  // Update last save time when manual save succeeds
  useEffect(() => {
    if (!isDirty && !isAutoSavingRef.current) {
      lastSaveTimeRef.current = Date.now();
    }
  }, [isDirty]);

  // Auto-save on page unload if project is dirty
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && !saveProject.isPending) {
        // Try to perform a synchronous save
        saveProject.mutate(undefined);
        
        // Show browser confirmation dialog
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, saveProject]);

  return {
    isAutoSaveActive: !!autoSaveIntervalRef.current,
    lastSaveTime: lastSaveTimeRef.current,
    isAutoSaving: isAutoSavingRef.current
  };
} 