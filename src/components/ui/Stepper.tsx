import React from "react";

type StepperProps = {
  steps: string[];
  currentStep: number;
};

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2">
      <div className="flex items-center justify-between">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                    isCompleted ? "bg-green-500 text-white" : ""
                  } ${isActive ? "bg-blue-600 text-white scale-110" : ""} ${
                    !isCompleted && !isActive ? "bg-gray-200 text-gray-500" : ""
                  }`}
                >
                  {isCompleted ? "✔" : stepNumber}
                </div>
                <p
                  className={`mt-2 text-sm text-center font-semibold ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {label}
                </p>
              </div>
              {stepNumber < steps.length && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
