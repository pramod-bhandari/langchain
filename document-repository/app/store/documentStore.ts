import { create } from 'zustand';
import { getSupabaseClient } from '@/app/lib/supabase/client';

export interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | null>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (document: Document | null) => void;
  updateDocumentStatus: (id: string, status: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,
  
  fetchDocuments: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await getSupabaseClient()
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ documents: data as Document[] });
    } catch (err) {
      console.error('Error fetching documents:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to fetch documents' });
    } finally {
      set({ loading: false });
    }
  },
  
  fetchDocument: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await getSupabaseClient()
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      set({ currentDocument: data as Document });
      return data as Document;
    } catch (err) {
      console.error('Error fetching document:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to fetch document' });
      return null;
    } finally {
      set({ loading: false });
    }
  },
  
  deleteDocument: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      // Get the document to delete first
      const { data: document } = await getSupabaseClient()
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single();
      
      // Delete from database
      const { error } = await getSupabaseClient()
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Also delete from storage if we have the file path
      if (document?.file_path) {
        const { error: storageError } = await getSupabaseClient().storage
          .from('documents')
          .remove([document.file_path]);
        
        if (storageError) console.error('Storage delete error:', storageError);
      }
      
      // Update the local state
      set((state) => ({
        documents: state.documents.filter(doc => doc.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument
      }));
      
    } catch (err) {
      console.error('Error deleting document:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to delete document' });
    } finally {
      set({ loading: false });
    }
  },
  
  setCurrentDocument: (document: Document | null) => {
    set({ currentDocument: document });
  },
  
  updateDocumentStatus: (id: string, indexed: boolean) => {
    set((state) => ({
      documents: state.documents.map(doc => 
        doc.id === id 
          ? { ...doc, metadata: { ...doc.metadata, indexed } } 
          : doc
      ),
      currentDocument: state.currentDocument?.id === id 
        ? { ...state.currentDocument, metadata: { ...state.currentDocument.metadata, indexed } } 
        : state.currentDocument
    }));
  }
})); 