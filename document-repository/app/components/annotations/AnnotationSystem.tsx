"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/app/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface Annotation {
  id: string;
  document_id: string;
  content: string;
  position?: {
    x: number;
    y: number;
    page?: number;
  };
  created_at: string;
}

interface AnnotationSystemProps {
  documentId: string;
}

const AnnotationSystem: React.FC<AnnotationSystemProps> = ({ documentId }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newAnnotation, setNewAnnotation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnotations();
  }, [documentId]);

  const fetchAnnotations = async () => {
    try {
      setLoading(true);
      const { data, error } = await getSupabaseClient()
        .from("annotations")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnotations(data || []);
    } catch (err) {
      console.error("Error fetching annotations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch annotations"
      );
    } finally {
      setLoading(false);
    }
  };

  const addAnnotation = async () => {
    if (!newAnnotation.trim()) return;

    try {
      const newAnnotationObj = {
        id: uuidv4(),
        document_id: documentId,
        content: newAnnotation,
        created_at: new Date().toISOString(),
      };

      const { error } = await getSupabaseClient()
        .from("annotations")
        .insert([newAnnotationObj]);

      if (error) throw error;

      setAnnotations([newAnnotationObj, ...annotations]);
      setNewAnnotation("");
    } catch (err) {
      console.error("Error adding annotation:", err);
      alert(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to add annotation"
      );
    }
  };

  const deleteAnnotation = async (id: string) => {
    try {
      const { error } = await getSupabaseClient()
        .from("annotations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAnnotations(annotations.filter((anno) => anno.id !== id));
    } catch (err) {
      console.error("Error deleting annotation:", err);
      alert(
        err instanceof Error
          ? `Error: ${err.message}`
          : "Failed to delete annotation"
      );
    }
  };

  return (
    <div className="annotation-system">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Annotations</h3>
        <div className="flex">
          <input
            type="text"
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            placeholder="Add a note about this document..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") addAnnotation();
            }}
          />
          <button
            onClick={addAnnotation}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-500 text-center py-4">
          Loading annotations...
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
          Error: {error}
        </div>
      ) : annotations.length === 0 ? (
        <div className="text-gray-500 text-center py-4 border border-gray-200 rounded-lg">
          No annotations yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {annotations.map((annotation, index) => (
            <div
              key={`${annotation.id}-${index}`}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <p className="text-gray-800">{annotation.content}</p>
                <button
                  onClick={() => deleteAnnotation(annotation.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(annotation.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnotationSystem;
