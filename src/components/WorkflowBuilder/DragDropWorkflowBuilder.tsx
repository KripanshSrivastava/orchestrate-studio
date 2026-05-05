import React, { useState, useCallback } from "react";
import {
  GripVertical,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Package,
  Play,
  Zap,
} from "lucide-react";

interface DragDropWorkflowBuilderProps {
  steps: any[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggle: (stepId: string, enabled: boolean) => void;
  onRemove?: (stepId: string) => void;
  onAddStep?: () => void;
  enabled: boolean[];
  customValues: Record<string, any>;
  onUpdateValue: (key: string, value: any) => void;
}

export const DragDropWorkflowBuilder: React.FC<
  DragDropWorkflowBuilderProps
> = ({
  steps,
  onReorder,
  onToggle,
  enabled,
  customValues,
  onUpdateValue,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
      setDraggedIndex(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      source: <Package className="w-4 h-4" />,
      build: <Zap className="w-4 h-4" />,
      test: <CheckCircle2 className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
      deploy: <Play className="w-4 h-4" />,
      monitoring: <Clock className="w-4 h-4" />,
      notification: <AlertCircle className="w-4 h-4" />,
    };
    return iconMap[category] || <Package className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      source: "bg-blue-50 border-blue-200 text-blue-900",
      build: "bg-amber-50 border-amber-200 text-amber-900",
      test: "bg-green-50 border-green-200 text-green-900",
      security: "bg-red-50 border-red-200 text-red-900",
      deploy: "bg-purple-50 border-purple-200 text-purple-900",
      monitoring: "bg-cyan-50 border-cyan-200 text-cyan-900",
      notification: "bg-pink-50 border-pink-200 text-pink-900",
    };
    return colorMap[category] || "bg-gray-50 border-gray-200";
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg font-semibold text-gray-900">
          Workflow Pipeline Builder
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Drag and drop to reorder steps. Integrated with modern Node.js libraries
          (axios, bullmq, redis, postgres, docker, socket.io)
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="divide-y divide-gray-200">
        {steps.map((step, index) => (
          <div
            key={`${step.id}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`transition-colors ${
              draggedIndex === index ? "bg-blue-50" : "hover:bg-gray-50"
            } ${!enabled[index] ? "opacity-50" : ""}`}
          >
            <div className="px-6 py-4">
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Category Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                        step.category
                      )}`}
                    >
                      {getCategoryIcon(step.category)}
                      {step.category}
                    </span>

                    {/* Timeout Badge */}
                    {step.timeout && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Timeout: {step.timeout}s
                      </span>
                    )}

                    {/* Retry Badge */}
                    {step.retryCount > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        Retries: {step.retryCount}
                      </span>
                    )}
                  </div>

                  <h4 className="font-medium text-gray-900 mb-1">
                    {step.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {step.description}
                  </p>

                  {/* Dependencies */}
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="text-xs text-gray-500 mb-3">
                      <strong>Depends on:</strong>{" "}
                      {step.dependencies.join(", ")}
                    </div>
                  )}

                  {/* Expandable Details */}
                  {expandedStepId === step.id && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-3 space-y-3 text-sm">
                      {/* Required Inputs */}
                      {step.requiredInputs && step.requiredInputs.length > 0 && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-2">
                            Required Inputs:
                          </label>
                          <div className="space-y-2">
                            {step.requiredInputs.map((input: string) => (
                              <input
                                key={input}
                                type="text"
                                placeholder={input}
                                value={customValues[input] || ""}
                                onChange={(e) =>
                                  onUpdateValue(input, e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Secrets Required */}
                      {step.secretsRequired && step.secretsRequired.length > 0 && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-2">
                            Secrets (stored securely):
                          </label>
                          <div className="space-y-2">
                            {step.secretsRequired.map((secret: string) => (
                              <div
                                key={secret}
                                className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded-md"
                              >
                                <Shield className="w-4 h-4 text-red-500" />
                                <span className="text-gray-700">{secret}</span>
                                <span className="text-xs text-gray-500 ml-auto">
                                  configured
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Environment Variables */}
                      {step.environment && Object.keys(step.environment).length > 0 && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-2">
                            Environment:
                          </label>
                          <div className="bg-white rounded-md p-3 font-mono text-xs space-y-1">
                            {Object.entries(step.environment).map(
                              ([key, value]) => (
                                <div key={key} className="text-gray-700">
                                  <span className="text-purple-600">{key}</span>
                                  <span className="text-gray-500">=</span>
                                  <span className="text-green-600">{String(value)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Handler Info */}
                      <div>
                        <label className="block font-medium text-gray-700 mb-2">
                          Handler Function:
                        </label>
                        <div className="bg-white rounded-md p-3 font-mono text-xs text-blue-600 break-all">
                          {step.handler}
                        </div>
                      </div>

                      {/* On Failure Action */}
                      {step.onFailure && (
                        <div>
                          <label className="block font-medium text-gray-700 mb-2">
                            On Failure:
                          </label>
                          <select
                            defaultValue={step.onFailure}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="fail">Fail pipeline</option>
                            <option value="continue">Continue</option>
                            <option value="skip">Skip</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle Enable/Disable */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled[index]}
                      onChange={(e) => onToggle(step.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-600">
                      {enabled[index] ? "Enabled" : "Disabled"}
                    </span>
                  </label>

                  {/* Expand Details */}
                  <button
                    onClick={() =>
                      setExpandedStepId(
                        expandedStepId === step.id ? null : step.id
                      )
                    }
                    className="px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    {expandedStepId === step.id ? "Hide" : "Show"} Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <strong>{steps.filter((_, i) => enabled[i]).length}</strong> of{" "}
          <strong>{steps.length}</strong> steps enabled
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Start Pipeline
        </button>
      </div>
    </div>
  );
};

export default DragDropWorkflowBuilder;
