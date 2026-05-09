import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  LinearProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Cancel,
  ExpandMore,
  Info,
  Download,
  Visibility,
  TrendingUp,
  Warning,
  Error as ErrorIcon,
  School,
  Work,
  Code,
  Email,
  Phone,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface Candidate {
  rank?: number;
  candidate_name: string;
  email: string;
  phone?: string;
  match_score?: number;
  anomaly_weight: number;
  anomaly_status: string;
  anomaly_severity: string;
  parsed_data?: any;
  anomaly_detection?: any;
  analysis?: any;
  file_name: string;
  rejection_reason?: string;
  recommendation?: string;
}

interface ScreeningResults {
  total_uploaded: number;
  shortlisted: number;
  rejected: number;
  errors: number;
  anomaly_threshold: number;
  shortlisted_candidates: Candidate[];
  rejected_candidates: Candidate[];
  processing_errors?: any[];
}

const BulkResumeScreening: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [anomalyThreshold, setAnomalyThreshold] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScreeningResults | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files);
      setFiles(fileList);
      setError('');
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleScreenResumes = async () => {
    if (files.length === 0) {
      setError('Please upload at least one resume');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      
      // Add all files
      files.forEach(file => {
        formData.append('files[]', file);
      });
      
      // Add job details
      formData.append('jobDescription', jobDescription);
      formData.append('requirements', requirements);
      formData.append('anomalyThreshold', anomalyThreshold.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await axios.post(
        `${API_URL}/api/hr/bulk-screen-resumes`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (response.data.success) {
        setResults(response.data.data);
      } else {
        setError(response.data.error || 'Screening failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to screen resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setDetailsOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'none': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'SHORTLISTED' ? <CheckCircle color="success" /> : <Cancel color="error" />;
  };

  const exportToCSV = () => {
    if (!results) return;

    const csvContent = [
      ['Rank', 'Name', 'Email', 'Phone', 'Match Score', 'Anomaly Weight', 'Status', 'File Name'],
      ...results.shortlisted_candidates.map(c => [
        c.rank || '',
        c.candidate_name,
        c.email,
        c.phone || '',
        c.match_score || '',
        c.anomaly_weight,
        c.anomaly_status,
        c.file_name,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screening_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Bulk Resume Screening
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload multiple candidate resumes to automatically screen, filter, and rank them
      </Typography>

      {/* Upload Section */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            1. Upload Candidate Resumes
          </Typography>
          
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUpload />}
            sx={{ mb: 2 }}
          >
            Select Resume Files
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.docx"
              onChange={handleFileChange}
            />
          </Button>

          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {files.length} file(s) selected:
              </Typography>
              {files.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => handleRemoveFile(index)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Job Description Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            2. Enter Job Description & Requirements
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Job Description *"
            placeholder="Enter the complete job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Key Requirements (Optional)"
            placeholder="Python, Django, 5+ years experience, Bachelor's degree..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              type="number"
              label="Anomaly Threshold"
              value={anomalyThreshold}
              onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
              sx={{ width: 200 }}
            />
            <Tooltip title="Candidates with anomaly weight above this threshold will be rejected">
              <Info color="action" />
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Recommended: 25-30 for technical roles, 30-40 for other roles
          </Typography>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleScreenResumes}
        disabled={loading || files.length === 0 || !jobDescription.trim()}
        startIcon={loading ? <LinearProgress /> : <TrendingUp />}
      >
        {loading ? 'Processing Resumes...' : 'Screen & Rank Candidates'}
      </Button>

      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Processing {files.length} resume(s)... {progress}%
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Section */}
      {results && !loading && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Screening Results</Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportToCSV}
            >
              Export to CSV
            </Button>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Uploaded
                  </Typography>
                  <Typography variant="h4">{results.total_uploaded}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    ✅ Shortlisted
                  </Typography>
                  <Typography variant="h4">{results.shortlisted}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    ❌ Rejected
                  </Typography>
                  <Typography variant="h4">{results.rejected}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Acceptance Rate
                  </Typography>
                  <Typography variant="h4">
                    {((results.shortlisted / results.total_uploaded) * 100).toFixed(0)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Shortlisted Candidates */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                ✅ Shortlisted Candidates ({results.shortlisted})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Rank</strong></TableCell>
                      <TableCell><strong>Candidate</strong></TableCell>
                      <TableCell><strong>Match Score</strong></TableCell>
                      <TableCell><strong>Anomaly</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.shortlisted_candidates.map((candidate, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip
                            label={`#${candidate.rank}`}
                            color={candidate.rank === 1 ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">{candidate.candidate_name}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip icon={<Email />} label={candidate.email} size="small" variant="outlined" />
                              {candidate.phone && (
                                <Chip icon={<Phone />} label={candidate.phone} size="small" variant="outlined" />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" color="primary">
                              {candidate.match_score}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={candidate.match_score || 0}
                              sx={{ width: 100 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getSeverityColor(candidate.anomaly_severity) === 'success' ? <CheckCircle /> : <Warning />}
                            label={`Weight: ${candidate.anomaly_weight}`}
                            color={getSeverityColor(candidate.anomaly_severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(candidate)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Rejected Candidates */}
          {results.rejected > 0 && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">
                  ❌ Rejected Candidates ({results.rejected})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Candidate</strong></TableCell>
                        <TableCell><strong>Anomaly Weight</strong></TableCell>
                        <TableCell><strong>Rejection Reason</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.rejected_candidates.map((candidate, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="subtitle2">{candidate.candidate_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {candidate.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<ErrorIcon />}
                              label={candidate.anomaly_weight}
                              color="error"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error">
                              {candidate.rejection_reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(candidate)}
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Candidate Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedCandidate && getStatusIcon(selectedCandidate.anomaly_status)}
            <Box>
              <Typography variant="h6">{selectedCandidate?.candidate_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedCandidate?.file_name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCandidate && (
            <Box>
              {/* Contact Info */}
              <Typography variant="subtitle1" gutterBottom><strong>Contact Information</strong></Typography>
              <Box sx={{ mb: 2 }}>
                <Typography><Email fontSize="small" sx={{ mr: 1 }} />{selectedCandidate.email}</Typography>
                {selectedCandidate.phone && (
                  <Typography><Phone fontSize="small" sx={{ mr: 1 }} />{selectedCandidate.phone}</Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Match Score (if shortlisted) */}
              {selectedCandidate.match_score && (
                <>
                  <Typography variant="subtitle1" gutterBottom><strong>Job Match Analysis</strong></Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography>Match Score:</Typography>
                      <Chip label={`${selectedCandidate.match_score}%`} color="primary" />
                    </Box>
                    <LinearProgress variant="determinate" value={selectedCandidate.match_score} />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Skills */}
              {selectedCandidate.parsed_data?.skills && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    <Code fontSize="small" sx={{ mr: 1 }} /><strong>Skills</strong>
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {selectedCandidate.parsed_data.skills.map((skill: string, i: number) => (
                      <Chip key={i} label={skill} size="small" sx={{ m: 0.5 }} />
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Experience */}
              {selectedCandidate.parsed_data?.experience && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    <Work fontSize="small" sx={{ mr: 1 }} /><strong>Experience</strong>
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {selectedCandidate.parsed_data.experience.map((exp: any, i: number) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="body2"><strong>{exp.title}</strong></Typography>
                        <Typography variant="caption">{exp.company} • {exp.duration}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Education */}
              {selectedCandidate.parsed_data?.education && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    <School fontSize="small" sx={{ mr: 1 }} /><strong>Education</strong>
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {selectedCandidate.parsed_data.education.map((edu: any, i: number) => (
                      <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="body2"><strong>{edu.degree}</strong></Typography>
                        <Typography variant="caption">{edu.institution} • {edu.year}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Anomaly Detection */}
              <Typography variant="subtitle1" gutterBottom>
                <Warning fontSize="small" sx={{ mr: 1 }} /><strong>Data Quality Analysis</strong>
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    label={`Weight: ${selectedCandidate.anomaly_weight}`}
                    color={getSeverityColor(selectedCandidate.anomaly_severity) as any}
                  />
                  <Chip
                    label={selectedCandidate.anomaly_severity.toUpperCase()}
                    color={getSeverityColor(selectedCandidate.anomaly_severity) as any}
                  />
                  <Chip
                    label={selectedCandidate.anomaly_status}
                    color={selectedCandidate.anomaly_status === 'SHORTLISTED' ? 'success' : 'error'}
                  />
                </Box>

                {selectedCandidate.anomaly_detection?.issues?.length > 0 && (
                  <Box>
                    <Typography variant="body2" gutterBottom><strong>Issues Found:</strong></Typography>
                    {selectedCandidate.anomaly_detection.issues.map((issue: any, i: number) => (
                      <Alert key={i} severity={getSeverityColor(issue.severity) as any} sx={{ mb: 1 }}>
                        <strong>{issue.field}:</strong> {issue.message}
                      </Alert>
                    ))}
                  </Box>
                )}

                {selectedCandidate.rejection_reason && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>Rejection Reason:</strong> {selectedCandidate.rejection_reason}
                  </Alert>
                )}

                {selectedCandidate.recommendation && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {selectedCandidate.recommendation}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BulkResumeScreening;
