import { CompareRequest, ModelResponse } from '../types/model';

export async function compareModels(request: CompareRequest): Promise<ModelResponse[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const response = await fetch(`${apiUrl}/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to compare models';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}