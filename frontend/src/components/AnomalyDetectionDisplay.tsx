import React from 'react';
import { Alert, AlertTitle, Badge, Box, Card, CardContent, Chip, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Warning, Error, Info, CheckCircle, ExpandMore } from '@mui/icons-material';

interface AnomalyIssue {
  type: string;
  severity: string;
  field: string;
  value: string;
  message: string;
}

interface AnomalyDetection {
  hasAnomalies: boolean;
  anomalyCount: number;
  severity: string; // 'none', 'low', 'medium', 'high'
  issues: AnomalyIssue[];
  details: {
    languagesInSkills?: string[];
    genericSoftwareInSkills?: string[];
    educationInExperience?: any[];
    experienceInEducation?: any[];
    duplicateSkills?: string[];
    duplicateExperiences?: any[];
  };
  report?: string;
  detectedAt?: string;
}

interface AnomalyDetectionDisplayProps {
  anomalyDetection: AnomalyDetection;
  compact?: boolean;
}

const AnomalyDetectionDisplay: React.FC<AnomalyDetectionDisplayProps> = ({ 
  anomalyDetection, 
  compact = false 
}) => {
  
  // Get severity color and icon
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'none': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return <Error />;
      case 'medium': return <Warning />;
      case 'low': return <Info />;
      case 'none': return <CheckCircle />;
      default: return <Info />;
    }
  };

  // Group issues by type
  const groupedIssues = anomalyDetection.issues?.reduce((acc, issue) => {
    if (!acc[issue.type]) {
      acc[issue.type] = [];
    }
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, AnomalyIssue[]>);

  // Compact view - just show badge
  if (compact) {
    if (!anomalyDetection.hasAnomalies) {
      return (
        <Chip 
          icon={<CheckCircle />} 
          label="No Issues" 
          color="success" 
          size="small"
          variant="outlined"
        />
      );
    }
    
    return (
      <Chip 
        icon={getSeverityIcon(anomalyDetection.severity)} 
        label={`${anomalyDetection.anomalyCount} Issue${anomalyDetection.anomalyCount !== 1 ? 's' : ''}`}
        color={getSeverityColor(anomalyDetection.severity) as any}
        size="small"
      />
    );
  }

  // Full view
  if (!anomalyDetection.hasAnomalies) {
    return (
      <Alert severity="success" icon={<CheckCircle />}>
        <AlertTitle>✅ No Data Quality Issues Detected</AlertTitle>
        Resume is well-formatted and properly structured. Ready for HR review.
      </Alert>
    );
  }

  return (
    <Card elevation={2} sx={{ my: 2 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box>
            {getSeverityIcon(anomalyDetection.severity)}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              Data Quality Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {anomalyDetection.anomalyCount} issue{anomalyDetection.anomalyCount !== 1 ? 's' : ''} detected
            </Typography>
          </Box>
          <Badge 
            badgeContent={anomalyDetection.anomalyCount} 
            color={getSeverityColor(anomalyDetection.severity) as any}
          >
            <Chip 
              label={anomalyDetection.severity.toUpperCase()} 
              color={getSeverityColor(anomalyDetection.severity) as any}
              size="small"
            />
          </Badge>
        </Box>

        {/* Issues by Type */}
        {groupedIssues && Object.entries(groupedIssues).map(([type, issues]) => (
          <Accordion key={type} defaultExpanded={anomalyDetection.severity === 'high'}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={issues.length} 
                  size="small" 
                  color={getSeverityColor(issues[0].severity) as any}
                />
                <Typography>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {issues.map((issue, idx) => (
                <Alert 
                  key={idx} 
                  severity={getSeverityColor(issue.severity) as any} 
                  sx={{ mb: 1 }}
                  variant="outlined"
                >
                  <AlertTitle>
                    <strong>{issue.field}:</strong> {issue.value}
                  </AlertTitle>
                  {issue.message}
                </Alert>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Full Report */}
        {anomalyDetection.report && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Summary Report
            </Typography>
            <Typography 
              variant="body2" 
              component="pre" 
              sx={{ 
                whiteSpace: 'pre-line', 
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            >
              {anomalyDetection.report}
            </Typography>
          </Box>
        )}

        {/* HR Recommendations */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            📋 HR Recommendations
          </Typography>
          {anomalyDetection.severity === 'high' && (
            <Alert severity="error" variant="outlined">
              <strong>High Priority:</strong> Review these issues carefully during the interview. 
              Verify education and work history thoroughly. Ask specific questions about timeline gaps.
            </Alert>
          )}
          {anomalyDetection.severity === 'medium' && (
            <Alert severity="warning" variant="outlined">
              <strong>Medium Priority:</strong> Mention these issues to the candidate. 
              Request clarification if needed, but don't reject based on formatting alone.
            </Alert>
          )}
          {anomalyDetection.severity === 'low' && (
            <Alert severity="info" variant="outlined">
              <strong>Low Priority:</strong> Minor formatting issues. 
              May mention to candidate to improve their resume, but unlikely to affect hiring decision.
            </Alert>
          )}
        </Box>

        {/* Detection Timestamp */}
        {anomalyDetection.detectedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Detected at: {new Date(anomalyDetection.detectedAt).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AnomalyDetectionDisplay;

// Example usage in parent component:
/*
import AnomalyDetectionDisplay from './AnomalyDetectionDisplay';

// In your resume display component:
{resume.anomalyDetection && (
  <AnomalyDetectionDisplay 
    anomalyDetection={resume.anomalyDetection} 
    compact={false} // or true for badge only
  />
)}

// In a table/list view (compact mode):
<TableCell>
  {resume.anomalyDetection && (
    <AnomalyDetectionDisplay 
      anomalyDetection={resume.anomalyDetection} 
      compact={true}
    />
  )}
</TableCell>
*/
