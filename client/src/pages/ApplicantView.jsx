import React from 'react';
import { useParams } from 'react-router-dom';

export default function ApplicantView() {
  const { applicantId, jobId } = useParams();

  return (
    <div>
      <h2>Applicant View</h2>
      <p>Status and position information for Applicant #{applicantId} on Job #{jobId}</p>
      <p>This is a placeholder component.</p>
    </div>
  );
}
