import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successRate = new Rate('success_rate');
const uploadedBytes = new Counter('uploaded_bytes');
const uploadDuration = new Trend('upload_duration');
const ttfb = new Trend('time_to_first_byte');
const connectionTime = new Trend('connection_time');

// Chat completion specific metrics
const chatSuccessRate = new Rate('chat_success_rate');
const chatResponseTime = new Trend('chat_response_time');
const chatTokensGenerated = new Counter('chat_tokens_generated');
const chatMessagesProcessed = new Counter('chat_messages_processed');

// For enhanced debugging
const debugLog = [];
function log(message) {
  console.log(`[DEBUG ${new Date().toISOString()}] ${message}`);
  debugLog.push(`[${new Date().toISOString()}] ${message}`);
}

// Configuration Constants
export const API_BASE_URL = 'http://localhost:8080/api/v1'; // Updated with actual server URL
const FILE_UPLOAD_ENDPOINT = `${API_BASE_URL}/files/?type=chat`;
const CHAT_COMPLETIONS_ENDPOINT = `${API_BASE_URL.replace('/v1', '')}/chat/completions`;

// Multiple user tokens for realistic load testing
const USER_TOKENS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiMDJkNmQ3LTc1MjEtNDc3YS1iZDUxLWViOWM0MmUyYzM0MCJ9.mhO2pouAnnDVDyOqo-XDqToRKoVsoX_rxIiB2gS75bM'
];

// Function to get a random user token
export function getRandomUserToken() {
  if (USER_TOKENS.length === 1) {
    return USER_TOKENS[0];
  }
  const randomIndex = Math.floor(Math.random() * USER_TOKENS.length);
  return USER_TOKENS[randomIndex];
}

// Function to get user token based on VU (Virtual User) ID for consistent user simulation
export function getUserTokenByVU() {
  const vuIndex = (__VU - 1) % USER_TOKENS.length;
  return USER_TOKENS[vuIndex];
}

// PRE-LOAD ALL FILES IN INIT STAGE - This is the correct k6 way!
const FILE_CONTENTS = {
  // Text files
  'very-small-10KB.txt': open('../test_files/very-small-10KB.txt', 'b'),
  'small-100KB.txt': open('../test_files/small-100KB.txt', 'b'),
  'medium-1MB.txt': open('../test_files/medium-1MB.txt', 'b'),
  
  // Word documents
  'document-50KB.docx': open('../test_files/document-50KB.docx', 'b'),
  'document-100KB.docx': open('../test_files/document-100KB.docx', 'b'),
  
  // PowerPoint presentations
  'presentation-50KB.pptx': open('../test_files/presentation-50KB.pptx', 'b'),
  'presentation-100KB.pptx': open('../test_files/presentation-100KB.pptx', 'b'),
  
  // Excel spreadsheets
  'spreadsheet-50KB.xlsx': open('../test_files/spreadsheet-50KB.xlsx', 'b'),
  'spreadsheet-100KB.xlsx': open('../test_files/spreadsheet-100KB.xlsx', 'b'),
  
  // PDF files
  'Data Science.pdf': open('../test_files/Data Science.pdf', 'b'),
  'Software Development Engineer.pdf': open('../test_files/Software Development Engineer.pdf', 'b'),
  'Resume.pdf': open('../test_files/Resume.pdf', 'b'),
  'Cyber-Security.pdf': open('../test_files/Cyber-Security.pdf', 'b'),
};

// Define file metadata
const TEST_FILES = {
  // Text files - these will be converted to PDF by the server
  'very-small-10KB.txt': { contentType: 'text/plain', size: 10 * 1024 },
  'small-100KB.txt': { contentType: 'text/plain', size: 100 * 1024 },
  'medium-1MB.txt': { contentType: 'text/plain', size: 1 * 1024 * 1024 },
  
  // Word documents
  'document-50KB.docx': { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 50 * 1024 },
  'document-100KB.docx': { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 100 * 1024 },
  
  // PowerPoint presentations
  'presentation-50KB.pptx': { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 50 * 1024 },
  'presentation-100KB.pptx': { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 100 * 1024 },
  
  // Excel spreadsheets
  'spreadsheet-50KB.xlsx': { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 50 * 1024 },
  'spreadsheet-100KB.xlsx': { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 100 * 1024 },
  
  // PDF files - these bypass conversion and upload directly
  'Data Science.pdf': { contentType: 'application/pdf', size: 111 * 1024 },
  'Software Development Engineer.pdf': { contentType: 'application/pdf', size: 104 * 1024 },
  'Resume.pdf': { contentType: 'application/pdf', size: 94 * 1024 },
  'Cyber-Security.pdf': { contentType: 'application/pdf', size: 113 * 1024 },
};

// ==============================================
// FILE UPLOAD TESTING CLASS
// ==============================================

class FileUploadTester {
  constructor() {
    this.endpoint = FILE_UPLOAD_ENDPOINT;
  }

  // Helper to get a random file from all available types
  getRandomFile() {
    const fileKeys = Object.keys(TEST_FILES);
    const randomKey = fileKeys[Math.floor(Math.random() * fileKeys.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random text file
  getRandomTextFile() {
    const textFiles = ['very-small-10KB.txt', 'small-100KB.txt', 'medium-1MB.txt'];
    const randomKey = textFiles[Math.floor(Math.random() * textFiles.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random Word file
  getRandomWordFile() {
    const wordFiles = ['document-50KB.docx', 'document-100KB.docx'];
    const randomKey = wordFiles[Math.floor(Math.random() * wordFiles.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random PowerPoint file
  getRandomPowerPointFile() {
    const pptFiles = ['presentation-50KB.pptx', 'presentation-100KB.pptx'];
    const randomKey = pptFiles[Math.floor(Math.random() * pptFiles.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random Excel file
  getRandomExcelFile() {
    const excelFiles = ['spreadsheet-50KB.xlsx', 'spreadsheet-100KB.xlsx'];
    const randomKey = excelFiles[Math.floor(Math.random() * excelFiles.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random office file (Word, PowerPoint, Excel)
  getRandomOfficeFile() {
    const fileType = Math.random();
    return fileType < 0.33 ? this.getRandomWordFile() : 
           fileType < 0.66 ? this.getRandomPowerPointFile() : 
           this.getRandomExcelFile();
  }

  // Helper to get a random PDF file
  getRandomPdfFile() {
    const pdfFiles = [
      'Data Science.pdf',
      'Software Development Engineer.pdf',
      'Resume.pdf',
      'Cyber-Security.pdf'
    ];
    const randomKey = pdfFiles[Math.floor(Math.random() * pdfFiles.length)];
    const selectedFile = TEST_FILES[randomKey];
    
    return {
      name: randomKey,
      contentType: selectedFile.contentType,
      size: selectedFile.size
    };
  }

  // Helper to get a random non-PDF file (to test conversion)
  getRandomNonPdfFile() {
    return Math.random() < 0.5 ? this.getRandomTextFile() : this.getRandomOfficeFile();
  }

  // Core file upload function
  uploadFile(file, simulatedNetworkDelay = 0) {
    try {
      // Simulate network latency if specified
      if (simulatedNetworkDelay > 0) {
        sleep(simulatedNetworkDelay / 1000); // Convert ms to seconds
      }

      log(`Starting upload of ${file.name} (${file.size} bytes)`);

      // Use pre-loaded file content
      const fileContent = FILE_CONTENTS[file.name];
      if (!fileContent) {
        throw new Error(`File content not found for ${file.name}`);
      }

      log(`Using pre-loaded file content, size: ${fileContent.length} bytes`);

      const formData = {
        file: http.file(fileContent, file.name, file.contentType),
      };

      // IMPORTANT: Don't specify Content-Type here, k6 will set it correctly with boundary
      const params = {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${getUserTokenByVU()}`,
        },
        tags: { name: `Upload ${file.name}` },
        timeout: '120s', // Longer timeout for larger files
      };

      // Measure the start time to calculate our own metrics
      const startTime = new Date().getTime();
      log(`HTTP request prepared, sending to ${this.endpoint}`);
      
      const response = http.post(this.endpoint, formData, params);
      
      // Calculate and add metrics
      const endTime = new Date().getTime();
      const duration = endTime - startTime;
      
      uploadDuration.add(duration);
      ttfb.add(response.timings.waiting);
      connectionTime.add(response.timings.connecting);
      uploadedBytes.add(file.size);
      
      // Check if the upload was successful
      let success = false;
      let uploadedFileInfo = null;
      
      if (response.status === 200) {
        try {
          // The response is an array with the file info
          if (response.body) {
            const responseData = JSON.parse(response.body);
            if (Array.isArray(responseData) && responseData.length > 0) {
              uploadedFileInfo = responseData[0];
              if (uploadedFileInfo && uploadedFileInfo.id) {
                success = true;
              }
            }
          }
        } catch (e) {
          log(`Error parsing response: ${e}`);
          log(`Response body: ${response.body}`);
        }
      }
      
      successRate.add(success);
      
      if (success) {
        log(`Upload successful for ${file.name}, took ${duration}ms, file ID: ${uploadedFileInfo.id}`);
      } else {
        log(`Upload FAILED for ${file.name}: Status ${response.status}`);
        if (response.body) {
          log(`Response body: ${response.body}`);
        }
      }
      
      return response;
    } catch (error) {
      log(`ERROR during upload of ${file.name}: ${error.message}`);
      successRate.add(false); // Ensure failed attempts are counted in metrics
      throw error;
    }
  }

  // Test functions for different file sizes
  smallFileTest() {
    const file = {
      name: 'very-small-10KB.txt',
      contentType: TEST_FILES['very-small-10KB.txt'].contentType,
      size: TEST_FILES['very-small-10KB.txt'].size
    };
    
    const delay = randomIntBetween(1000, 3000);
    this.uploadFile(file, delay);
  }

  mediumFileTest() {
    const file = {
      name: 'small-100KB.txt',
      contentType: TEST_FILES['small-100KB.txt'].contentType,
      size: TEST_FILES['small-100KB.txt'].size
    };
    
    const delay = randomIntBetween(2000, 5000);
    this.uploadFile(file, delay);
  }

  largeFileTest() {
    const file = {
      name: 'medium-1MB.txt',
      contentType: TEST_FILES['medium-1MB.txt'].contentType,
      size: TEST_FILES['medium-1MB.txt'].size
    };
    
    const delay = randomIntBetween(3000, 8000);
    this.uploadFile(file, delay);
  }

  textFileTest() {
    const file = this.getRandomTextFile();
    const delay = randomIntBetween(2000, 6000);
    this.uploadFile(file, delay);
  }

  officeDocumentTest() {
    const file = this.getRandomOfficeFile();
    const delay = randomIntBetween(6000, 10000);
    this.uploadFile(file, delay);
  }

  allDocumentTypesTest() {
    const fileType = Math.random();
    let file;
    
    if (fileType < 0.25) {
      file = this.getRandomTextFile();
    } else if (fileType < 0.5) {
      file = this.getRandomWordFile();
    } else if (fileType < 0.75) {
      file = this.getRandomPowerPointFile();
    } else {
      file = this.getRandomExcelFile();
    }
    
    const delay = randomIntBetween(5000, 12000);
    this.uploadFile(file, delay);
  }

  pdfOnlyUpload() {
    const file = this.getRandomPdfFile();
    const delay = randomIntBetween(500, 1500);
    this.uploadFile(file, delay);
  }
}

// ==============================================
// CHAT COMPLETION TESTING CLASS
// ==============================================

class ChatCompletionTester {
  constructor() {
    this.endpoint = CHAT_COMPLETIONS_ENDPOINT;
    // Default models - can be overridden via environment or configuration
    this.models = [
      'gpt-4o',
      'gpt-4o-mini'
    ];
    this.conversationTopics = [
      'Tell me about artificial intelligence',
      'Explain quantum computing in simple terms',
      'What are the benefits of renewable energy?',
      'How does machine learning work?',
      'Describe the process of photosynthesis',
      'What is the history of the internet?',
      'Explain the concept of blockchain technology',
      'How do neural networks function?',
      'What are the principles of sustainable development?',
      'Describe the structure of DNA'
    ];
  }

  // Method to update available models (useful for different test environments)
  setModels(models) {
    if (Array.isArray(models) && models.length > 0) {
      this.models = models;
    } else {
      throw new Error('Models must be a non-empty array');
    }
  }

  // Helper function to get a random model for testing
  getRandomModel() {
    if (this.models.length === 0) {
      throw new Error('No models available for testing');
    }
    return this.models[Math.floor(Math.random() * this.models.length)];
  }

  // Helper function to get a random conversation starter
  getRandomConversationTopic() {
    return this.conversationTopics[Math.floor(Math.random() * this.conversationTopics.length)];
  }

  // Helper function to generate random follow-up questions
  generateFollowUpQuestion(topic) {
    const followUps = [
      `Can you provide more details about ${topic}?`,
      `What are the practical applications of ${topic}?`,
      `How has ${topic} evolved over time?`,
      `What are the challenges related to ${topic}?`,
      `Can you give examples of ${topic} in real life?`
    ];
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  // Core function to send chat completion requests
  sendChatCompletion(payload, simulatedNetworkDelay = 0) {
    try {
      // Simulate network latency if specified
      if (simulatedNetworkDelay > 0) {
        sleep(simulatedNetworkDelay / 1000);
      }

      log(`Starting chat completion with model: ${payload.model}`);

      const params = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${getUserTokenByVU()}`,
        },
        tags: { name: `Chat Completion ${payload.model}` },
        timeout: '120s',
      };

      const startTime = new Date().getTime();
      const response = http.post(this.endpoint, JSON.stringify(payload), params);
      const endTime = new Date().getTime();
      const duration = endTime - startTime;

      // Update metrics
      chatResponseTime.add(duration);
      ttfb.add(response.timings.waiting);
      connectionTime.add(response.timings.connecting);
      chatMessagesProcessed.add(payload.messages.length);

      let success = false;
      let responseData = null;

      if (response.status === 200) {
        try {
          responseData = JSON.parse(response.body);
          if (responseData && responseData.choices && responseData.choices.length > 0) {
            success = true;
            const content = responseData.choices[0].message.content;
            if (content) {
              // Rough token estimation (1 token ≈ 4 characters)
              const estimatedTokens = Math.ceil(content.length / 4);
              chatTokensGenerated.add(estimatedTokens);
            }
          }
        } catch (e) {
          log(`Error parsing chat completion response: ${e}`);
          log(`Response body: ${response.body}`);
        }
      }

      chatSuccessRate.add(success);

      if (success) {
        log(`Chat completion successful for model ${payload.model}, took ${duration}ms`);
      } else {
        log(`Chat completion FAILED for model ${payload.model}: Status ${response.status}`);
        if (response.body) {
          log(`Response body: ${response.body}`);
        }
      }

      return response;
    } catch (error) {
      log(`ERROR during chat completion: ${error.message}`);
      chatSuccessRate.add(false); // Ensure failed attempts are counted in metrics
      throw error;
    }
  }

  // Basic chat completion test - single message
  basicChatCompletion() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: topic
        }
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 150
    };

    const delay = randomIntBetween(1000, 3000);
    this.sendChatCompletion(payload, delay);
  }

  // Multi-turn conversation test
  multiTurnConversation() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const payload = {
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides clear and concise answers."
        },
        {
          role: "user",
          content: topic
        },
        {
          role: "assistant",
          content: "I'd be happy to help you with that topic. Let me provide you with some information."
        },
        {
          role: "user",
          content: this.generateFollowUpQuestion(topic)
        }
      ],
      stream: false,
      temperature: 0.7,
      max_tokens: 200
    };

    const delay = randomIntBetween(2000, 5000);
    this.sendChatCompletion(payload, delay);
  }

  // Long conversation test - tests memory and context handling
  longConversationTest() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const messages = [
      {
        role: "system",
        content: "You are a knowledgeable assistant helping with detailed explanations."
      },
      {
        role: "user",
        content: topic
      }
    ];

    // Add multiple turns to create a longer conversation
    for (let i = 0; i < 5; i++) {
      messages.push({
        role: "assistant",
        content: `This is response ${i + 1} providing information about the topic.`
      });
      messages.push({
        role: "user",
        content: this.generateFollowUpQuestion(topic)
      });
    }

    const payload = {
      model: model,
      messages: messages,
      stream: false,
      temperature: 0.5,
      max_tokens: 300
    };

    const delay = randomIntBetween(3000, 8000);
    this.sendChatCompletion(payload, delay);
  }

  // Streaming chat completion test
  streamingChatCompletion() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: `Please provide a detailed explanation of: ${topic}`
        }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 500
    };

    const delay = randomIntBetween(1000, 4000);
    this.sendChatCompletion(payload, delay);
  }

  // Chat completion with files test
  chatWithFilesCompletion() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    // Simulate file references (you may need to adjust based on your file upload implementation)
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: `Based on the uploaded documents, please explain: ${topic}`
        }
      ],
      files: [
        // Simulate file references - adjust based on your actual file structure
        { id: "file_123", name: "document.pdf" },
        { id: "file_456", name: "data.txt" }
      ],
      stream: false,
      temperature: 0.6,
      max_tokens: 250
    };

    const delay = randomIntBetween(2000, 6000);
    this.sendChatCompletion(payload, delay);
  }

  // High concurrency chat test
  concurrentChatCompletion() {
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: topic
        }
      ],
      stream: false,
      temperature: 0.8,
      max_tokens: 100
    };

    // Minimal delay for high concurrency
    const delay = randomIntBetween(500, 1500);
    this.sendChatCompletion(payload, delay);
  }

  // Mixed model chat test - tests different models in parallel
  mixedModelChatTest() {
    // Randomly select model for each request
    const model = this.getRandomModel();
    const topic = this.getRandomConversationTopic();
    
    const payload = {
      model: model,
      messages: [
        {
          role: "user",
          content: topic
        }
      ],
      stream: Math.random() < 0.5, // 50% chance of streaming
      temperature: Math.random() * 0.9 + 0.1, // Random temperature between 0.1 and 1.0
      max_tokens: randomIntBetween(100, 400)
    };

    const delay = randomIntBetween(1000, 4000);
    this.sendChatCompletion(payload, delay);
  }
}

// ==============================================
// INITIALIZE CLASS INSTANCES
// ==============================================

const fileUploader = new FileUploadTester();
const chatTester = new ChatCompletionTester();

// ==============================================
// SCENARIO FUNCTION EXPORTS
// ==============================================

// ==============================================
// FILE UPLOAD SCENARIO FUNCTIONS
// ==============================================

export function basicConcurrentUpload() {
  const file = {
    name: 'small-100KB.txt',
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  const delay = randomIntBetween(1000, 3000);
  fileUploader.uploadFile(file, delay);
}

export function gradualUserScaling() {
  const file = fileUploader.getRandomTextFile();
  const delay = randomIntBetween(2000, 5000);
  fileUploader.uploadFile(file, delay);
}

export function realisticOfficePattern() {
  const vuNumber = __VU;
  let file;
  
  if (vuNumber <= 2) {
    // 2 users uploading large files
    file = {
      name: 'medium-1MB.txt',
      contentType: TEST_FILES['medium-1MB.txt'].contentType,
      size: TEST_FILES['medium-1MB.txt'].size
    };
  } else if (vuNumber <= 7) {
    // 5 users uploading medium files
    file = {
      name: 'small-100KB.txt',
      contentType: TEST_FILES['small-100KB.txt'].contentType,
      size: TEST_FILES['small-100KB.txt'].size
    };
  } else {
    // 3 users uploading small files
    file = {
      name: 'very-small-10KB.txt',
      contentType: TEST_FILES['very-small-10KB.txt'].contentType,
      size: TEST_FILES['very-small-10KB.txt'].size
    };
  }
  
  const delay = randomIntBetween(3000, 10000);
  fileUploader.uploadFile(file, delay);
}

export function burstUploadActivity() {
  const file = {
    name: 'medium-1MB.txt',
    contentType: TEST_FILES['medium-1MB.txt'].contentType,
    size: TEST_FILES['medium-1MB.txt'].size
  };
  
  // Shorter delay to simulate burst
  const delay = randomIntBetween(1000, 3000);
  fileUploader.uploadFile(file, delay);
}

export function largeFileHandling() {
  const file = {
    name: 'medium-1MB.txt',
    contentType: TEST_FILES['medium-1MB.txt'].contentType,
    size: TEST_FILES['medium-1MB.txt'].size
  };
  
  const delay = randomIntBetween(5000, 10000);
  fileUploader.uploadFile(file, delay);
}

export function mixedOperations() {
  const vuNumber = __VU;
  
  if (vuNumber <= 5) {
    // 5 users uploading
    const file = fileUploader.getRandomFile();
    const delay = randomIntBetween(2000, 6000);
    fileUploader.uploadFile(file, delay);
  } else if (vuNumber <= 7) {
    // 2 users "downloading" (simulated with API health check)
    apiHealthCheck();
  } else {
    // 3 users "browsing" (simulated with API health check)
    sleep(randomIntBetween(3, 8));
    apiHealthCheck();
  }
}

export function networkVariance() {
  const vuNumber = __VU;
  const file = {
    name: 'small-100KB.txt',
    contentType: TEST_FILES['small-100KB.txt'].contentType,
    size: TEST_FILES['small-100KB.txt'].size
  };
  
  let delay;
  if (vuNumber <= 3) {
    delay = randomIntBetween(500, 1500);
  } else if (vuNumber <= 7) {
    delay = randomIntBetween(2000, 5000);
  } else {
    delay = randomIntBetween(8000, 15000);
  }
  
  fileUploader.uploadFile(file, delay);
}

export function maximumCapacity() {
  const file = {
    name: 'medium-1MB.txt',
    contentType: TEST_FILES['medium-1MB.txt'].contentType,
    size: TEST_FILES['medium-1MB.txt'].size
  };
  
  const delay = randomIntBetween(1000, 2000);
  fileUploader.uploadFile(file, delay);
}

export function mixedFileTypesWithLongerDelays() {
  const file = Math.random() < 0.5 ? fileUploader.getRandomPdfFile() : fileUploader.getRandomNonPdfFile();
  const delay = randomIntBetween(8000, 12000);
  fileUploader.uploadFile(file, delay);
}

export function documentUploadStressTest() {
  const iteration = __ITER;
  const file = iteration % 2 === 0 ? fileUploader.getRandomPdfFile() : fileUploader.getRandomNonPdfFile();
  const delay = randomIntBetween(4000, 8000);
  fileUploader.uploadFile(file, delay);
}

export function pdfOnlyUpload() {
  fileUploader.pdfOnlyUpload();
}

// ==============================================
// CHAT COMPLETION SCENARIO FUNCTIONS
// ==============================================
export function basicChatCompletion() {
  chatTester.basicChatCompletion();
}

export function multiTurnConversation() {
  chatTester.multiTurnConversation();
}

export function longConversationTest() {
  chatTester.longConversationTest();
}

export function streamingChatCompletion() {
  chatTester.streamingChatCompletion();
}

export function chatWithFilesCompletion() {
  chatTester.chatWithFilesCompletion();
}

export function concurrentChatCompletion() {
  chatTester.concurrentChatCompletion();
}

export function mixedModelChatTest() {
  chatTester.mixedModelChatTest();
}

// ==============================================
// LEGACY SUPPORT FUNCTIONS
// ==============================================
export function smallFileTest() {
  fileUploader.smallFileTest();
}

export function mediumFileTest() {
  fileUploader.mediumFileTest();
}

export function largeFileTest() {
  fileUploader.largeFileTest();
}

export function textFileTest() {
  fileUploader.textFileTest();
}

export function officeDocumentTest() {
  fileUploader.officeDocumentTest();
}

export function allDocumentTypesTest() {
  fileUploader.allDocumentTypesTest();
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
export function apiHealthCheck() {
  try {
    log(`Running API health check, VU: ${__VU}`);
    const response = http.get(`${API_BASE_URL}/files/`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getUserTokenByVU()}`,
      },
      tags: { name: 'API Health Check' },
    });
    
    check(response, {
      'API health check successful': (r) => r.status === 200,
      'API response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    log(`API health check complete: Status ${response.status}, duration ${response.timings.duration}ms`);
    sleep(1);
  } catch (error) {
    log(`ERROR in apiHealthCheck: ${error.message}`);
    throw error;
  }
}

export function getDebugLogs() {
  return debugLog.join("\n");
}

// ==============================================
// CONFIGURATION AND UTILITY EXPORTS
// ==============================================

// Export uploadFile function for backward compatibility
export function uploadFileToOpenAI(file, simulatedNetworkDelay = 0) {
  return fileUploader.uploadFile(file, simulatedNetworkDelay);
}

// Export utility functions for external configuration
export function updateChatModels(models) {
  return chatTester.setModels(models);
}

export function getChatModels() {
  return chatTester.models;
}

export function getAvailableFileTypes() {
  return Object.keys(TEST_FILES);
}

// Main test configuration
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<10000'],
    'http_req_failed': ['rate<0.05'],
    'success_rate': ['rate>0.95'],
    'chat_success_rate': ['rate>0.90'],
    'chat_response_time': ['p(95)<15000'],
  },
};
