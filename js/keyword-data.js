/**
 * Keyword Data for Portfolio Interactive Explorer
 * Maps technologies to their implementations in the Nemo_Server repository
 */

const GITHUB_BASE = 'https://github.com/pruittcolon/NeMo_Server/blob/main';

const keywordData = {
    // ══════════════════════════════════════════════════════════
    // CORE AI/ML - Tier 1 (Most impressive for Senior AI role)
    // ══════════════════════════════════════════════════════════

    'PyTorch': {
        category: 'core-ai',
        summary: 'Deep learning framework used for all neural network inference',
        explanation: 'Powers the ML Service engines including Titan AutoML, Oracle Causal, and Chronos Time Series. Models are loaded with optimized inference settings for single-GPU deployment.',
        files: [
            { name: 'titan_engine.py', path: 'services/ml-service/src/engines/titan_engine.py', size: '97KB' },
            { name: 'oracle_engine.py', path: 'services/ml-service/src/engines/oracle_engine.py', size: '23KB' },
            { name: 'chronos_engine.py', path: 'services/ml-service/src/engines/chronos_engine.py', size: '36KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Gemma LLM': {
        category: 'core-ai',
        summary: 'Google\'s Gemma 3 4B model for conversational AI',
        explanation: 'Runs locally via llama.cpp with 4-bit quantization. Integrates RAG context, emotional awareness, and business analysis for contextual responses.',
        files: [
            { name: 'main.py', path: 'services/gemma-service/src/main.py', size: '60KB' }
        ],
        folder: 'services/gemma-service/src/'
    },

    'Llama.cpp': {
        category: 'core-ai',
        summary: 'Efficient C++ inference engine for running LLMs locally',
        explanation: 'Enables running Gemma 3 4B with 4-bit quantization on consumer GPUs. Provides the GGUF model inference backend for the Gemma Service.',
        files: [
            { name: 'main.py', path: 'services/gemma-service/src/main.py', size: '60KB' }
        ],
        folder: 'services/gemma-service/src/'
    },

    'NVIDIA NeMo': {
        category: 'core-ai',
        summary: 'NVIDIA\'s toolkit for speech AI models',
        explanation: 'Used for Parakeet ASR (speech-to-text) and TitaNet speaker verification. Provides production-grade models optimized for NVIDIA GPUs.',
        files: [
            { name: 'main.py', path: 'services/transcription-service/src/main.py', size: '28KB' }
        ],
        folder: 'services/transcription-service/src/'
    },

    'Parakeet ASR': {
        category: 'core-ai',
        summary: 'Real-time automatic speech recognition model',
        explanation: 'NVIDIA\'s Parakeet TDT 0.6B provides streaming speech-to-text. Can run on CPU to avoid VRAM contention with LLM inference.',
        files: [
            { name: 'main.py', path: 'services/transcription-service/src/main.py', size: '28KB' }
        ],
        folder: 'services/transcription-service/src/'
    },

    'FAISS': {
        category: 'core-ai',
        summary: 'Facebook AI Similarity Search for vector embeddings',
        explanation: 'Powers the RAG service\'s semantic search. Stores conversation memory and knowledge bases for retrieval-augmented generation.',
        files: [
            { name: 'main.py', path: 'services/rag-service/src/main.py', size: '35KB' }
        ],
        folder: 'services/rag-service/src/'
    },

    'Sentence-Transformers': {
        category: 'core-ai',
        summary: 'Neural text embeddings for semantic similarity',
        explanation: 'MiniLM model generates embeddings for RAG queries and document chunks. Enables semantic search across conversation history.',
        files: [
            { name: 'main.py', path: 'services/rag-service/src/main.py', size: '35KB' }
        ],
        folder: 'services/rag-service/src/'
    },

    'DistilRoBERTa': {
        category: 'core-ai',
        summary: 'Lightweight transformer for emotion analysis',
        explanation: 'Fine-tuned for multi-dimensional emotion classification. Provides sentiment scoring and emotional tone detection for conversation context.',
        files: [
            { name: 'main.py', path: 'services/emotion-service/src/main.py', size: '18KB' },
            { name: 'emotion_analyzer.py', path: 'shared/emotion_analyzer.py', size: '4KB' }
        ],
        folder: 'services/emotion-service/src/'
    },

    // ══════════════════════════════════════════════════════════
    // ML ENGINES - Tier 1 (Core analytical engines)
    // ══════════════════════════════════════════════════════════

    'Titan AutoML': {
        category: 'ml-engines',
        summary: 'Flagship automated machine learning engine',
        explanation: 'Automatically selects optimal models for any dataset. Uses ensemble methods, feature engineering, and hyperparameter optimization to deliver production-ready predictions.',
        files: [
            { name: 'titan_engine.py', path: 'services/ml-service/src/engines/titan_engine.py', size: '97KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Oracle Causal': {
        category: 'ml-engines',
        summary: 'Causal inference and counterfactual analysis',
        explanation: 'Discovers causal relationships in data using DoWhy methodology. Enables "what-if" scenario analysis beyond correlation-based predictions.',
        files: [
            { name: 'oracle_engine.py', path: 'services/ml-service/src/engines/oracle_engine.py', size: '23KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Newton Symbolic': {
        category: 'ml-engines',
        summary: 'Symbolic regression for interpretable equations',
        explanation: 'Uses genetic programming to discover mathematical formulas that explain data. Produces human-readable equations instead of black-box models.',
        files: [
            { name: 'newton_engine.py', path: 'services/ml-service/src/engines/newton_engine.py', size: '23KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Chronos Temporal': {
        category: 'ml-engines',
        summary: 'Time series forecasting with Prophet',
        explanation: 'Specialized for temporal data analysis. Uses Facebook\'s Prophet for trend detection, seasonality modeling, and multi-step forecasts.',
        files: [
            { name: 'chronos_engine.py', path: 'services/ml-service/src/engines/chronos_engine.py', size: '36KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Galileo Geometric': {
        category: 'ml-engines',
        summary: 'Graph neural network for relational data',
        explanation: 'Analyzes entity relationships and network structures. Discovers hidden patterns in connected data like customer networks or product relationships.',
        files: [
            { name: 'galileo_engine.py', path: 'services/ml-service/src/engines/galileo_engine.py', size: '25KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Mirror Synthetic': {
        category: 'ml-engines',
        summary: 'Synthetic data generation for augmentation',
        explanation: 'Generates realistic synthetic data matching original distributions. Used for data augmentation and privacy-preserving dataset sharing.',
        files: [
            { name: 'mirror_engine.py', path: 'services/ml-service/src/engines/mirror_engine.py', size: '23KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Scout Discovery': {
        category: 'ml-engines',
        summary: 'Automated feature discovery and selection',
        explanation: 'Scans datasets to identify the most predictive features. Uses statistical tests and information theory to rank feature importance.',
        files: [
            { name: 'scout_engine.py', path: 'services/ml-service/src/engines/scout_engine.py', size: '29KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    'Chaos Non-Linear': {
        category: 'ml-engines',
        summary: 'Non-linear dynamics and chaos theory analysis',
        explanation: 'Detects chaotic patterns and non-linear relationships. Uses Lyapunov exponents and phase space reconstruction for complex system analysis.',
        files: [
            { name: 'chaos_engine.py', path: 'services/ml-service/src/engines/chaos_engine.py', size: '27KB' }
        ],
        folder: 'services/ml-service/src/engines/'
    },

    // ══════════════════════════════════════════════════════════
    // BACKEND - Tier 2
    // ══════════════════════════════════════════════════════════

    'FastAPI': {
        category: 'backend',
        summary: 'High-performance Python web framework for all services',
        explanation: 'Every microservice exposes REST APIs via FastAPI. Provides automatic OpenAPI documentation, request validation, and async support.',
        files: [
            { name: 'main.py (API Gateway)', path: 'services/api-gateway/src/main.py', size: '45KB' },
            { name: 'main.py (ML Service)', path: 'services/ml-service/src/main.py', size: '60KB' },
            { name: 'main.py (Gemma Service)', path: 'services/gemma-service/src/main.py', size: '60KB' }
        ],
        folder: 'services/'
    },

    'Redis': {
        category: 'backend',
        summary: 'In-memory data store for GPU coordination and caching',
        explanation: 'Manages the GPU semaphore lock for exclusive GPU access. Also used for replay protection, real-time pub/sub, and session caching.',
        files: [
            { name: 'main.py', path: 'services/queue-service/src/main.py', size: '12KB' }
        ],
        folder: 'services/queue-service/src/'
    },

    'PostgreSQL': {
        category: 'backend',
        summary: 'Relational database for durable task persistence',
        explanation: 'Stores GPU job queue for crash recovery. Ensures Gemma and ML tasks survive service restarts without losing work.',
        files: [
            { name: 'main.py', path: 'services/queue-service/src/main.py', size: '12KB' }
        ],
        folder: 'services/queue-service/src/'
    },

    'WebSocket': {
        category: 'backend',
        summary: 'Real-time bidirectional communication',
        explanation: 'API Gateway maintains WebSocket connections for streaming transcription updates and real-time chat responses.',
        files: [
            { name: 'main.py', path: 'services/api-gateway/src/main.py', size: '45KB' }
        ],
        folder: 'services/api-gateway/src/'
    },

    'SQLCipher': {
        category: 'backend',
        summary: 'AES-256 encrypted SQLite databases',
        explanation: 'All sensitive data (RAG memories, emails, transcripts) is stored in encrypted SQLite databases. Keys managed via Docker secrets.',
        files: [
            { name: 'encrypted_db.py', path: 'shared/crypto/encrypted_db.py', size: '8KB' }
        ],
        folder: 'shared/crypto/'
    },

    // ══════════════════════════════════════════════════════════
    // INFRASTRUCTURE - Tier 2
    // ══════════════════════════════════════════════════════════

    'Docker': {
        category: 'infrastructure',
        summary: 'Containerization for all microservices',
        explanation: 'Each service has its own Dockerfile with multi-stage builds. Docker Compose orchestrates the full stack for local development.',
        files: [
            { name: 'docker-compose.yml', path: 'docker/docker-compose.yml', size: '8KB' },
            { name: 'Dockerfile (API Gateway)', path: 'docker/api-gateway/Dockerfile', size: '2KB' }
        ],
        folder: 'docker/'
    },

    'Kubernetes': {
        category: 'infrastructure',
        summary: 'Production orchestration with full manifests',
        explanation: 'Complete K8s deployment with Deployments, Services, Ingress, and NVIDIA GPU device plugin. Kustomize overlays for dev/prod environments.',
        files: [
            { name: 'deployments.yaml', path: 'k8s/base/deployments.yaml', size: '25KB' },
            { name: 'services.yaml', path: 'k8s/base/services.yaml', size: '4KB' },
            { name: 'ingress.yaml', path: 'k8s/base/ingress.yaml', size: '2KB' }
        ],
        folder: 'k8s/base/'
    },

    'Kustomize': {
        category: 'infrastructure',
        summary: 'Environment-specific Kubernetes configuration',
        explanation: 'Base manifests with overlays for local development and production. Enables environment-specific resource limits and secrets.',
        files: [
            { name: 'kustomization.yaml', path: 'k8s/base/kustomization.yaml', size: '1KB' }
        ],
        folder: 'k8s/'
    },

    'CUDA': {
        category: 'infrastructure',
        summary: 'NVIDIA GPU acceleration for ML inference',
        explanation: 'CUDA 12.1 runtime in containers enables GPU-accelerated inference. Device plugin passes GPU access to Kubernetes pods.',
        files: [
            { name: 'nvidia-device-plugin.yaml', path: 'k8s/base/nvidia-device-plugin.yaml', size: '3KB' }
        ],
        folder: 'k8s/base/'
    },

    // ══════════════════════════════════════════════════════════
    // SECURITY - Tier 2
    // ══════════════════════════════════════════════════════════

    'JWT Authentication': {
        category: 'security',
        summary: 'Token-based authentication with replay protection',
        explanation: 'API Gateway validates JWTs for all requests. Service-to-service communication uses short-lived tokens with Redis-backed replay protection.',
        files: [
            { name: 'auth_manager.py', path: 'services/api-gateway/src/auth/auth_manager.py', size: '12KB' },
            { name: 'security.py', path: 'shared/security/security.py', size: '8KB' }
        ],
        folder: 'services/api-gateway/src/auth/'
    },

    'AES-256 Encryption': {
        category: 'security',
        summary: 'At-rest encryption for all sensitive databases',
        explanation: 'SQLCipher wraps SQLite with AES-256-CBC encryption. Encryption keys loaded from Docker secrets with environment fallback.',
        files: [
            { name: 'encrypted_db.py', path: 'shared/crypto/encrypted_db.py', size: '8KB' }
        ],
        folder: 'shared/crypto/'
    },

    'Docker Secrets': {
        category: 'security',
        summary: 'Secure secrets management for production',
        explanation: 'JWT signing keys, database encryption keys, and credentials are mounted via /run/secrets. Strong-length validation rejects weak defaults.',
        files: [
            { name: 'secrets.yaml', path: 'k8s/base/secrets.yaml', size: '2KB' }
        ],
        folder: 'k8s/base/'
    },

    // ══════════════════════════════════════════════════════════
    // ARCHITECTURE PATTERNS - Tier 3
    // ══════════════════════════════════════════════════════════

    'GPU Semaphore': {
        category: 'patterns',
        summary: 'Custom locking for single-GPU multi-model inference',
        explanation: 'Redis-backed semaphore coordinates exclusive GPU access. Preemptively pauses transcription when LLM needs VRAM, then resumes after.',
        files: [
            { name: 'main.py', path: 'services/queue-service/src/main.py', size: '12KB' }
        ],
        folder: 'services/queue-service/src/'
    },

    'Microservices': {
        category: 'patterns',
        summary: '10 services following hub-and-spoke pattern',
        explanation: 'API Gateway routes to specialized services (Gemma, Transcription, RAG, ML, Emotion, Insights). Internal network isolates services.',
        files: [
            { name: 'main.py', path: 'services/api-gateway/src/main.py', size: '45KB' }
        ],
        folder: 'services/'
    },

    'RAG (Retrieval-Augmented Generation)': {
        category: 'patterns',
        summary: 'Context injection for grounded LLM responses',
        explanation: 'FAISS vector store holds conversation memory. Relevant context is retrieved and injected into Gemma prompts for contextual responses.',
        files: [
            { name: 'main.py', path: 'services/rag-service/src/main.py', size: '35KB' }
        ],
        folder: 'services/rag-service/src/'
    },

    'System 2 Thinking': {
        category: 'patterns',
        summary: 'LLM outputs verified by deterministic ML engines',
        explanation: 'Gemma provides fast "System 1" responses. ML Service engines (AutoML, causal inference) provide slower "System 2" statistical verification.',
        files: [
            { name: 'engines.py', path: 'services/ml-service/src/engines.py', size: '61KB' }
        ],
        folder: 'services/ml-service/src/'
    }
};

// Category metadata for display grouping
const categoryMeta = {
    'core-ai': { label: 'Core AI/ML', order: 1, color: '#6B5B95' },
    'ml-engines': { label: 'ML Engines', order: 2, color: '#88B04B' },
    'backend': { label: 'Backend', order: 3, color: '#009B77' },
    'infrastructure': { label: 'Infrastructure', order: 4, color: '#DD4124' },
    'security': { label: 'Security', order: 5, color: '#EFC050' },
    'patterns': { label: 'Architecture Patterns', order: 6, color: '#5B5EA6' }
};

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { keywordData, categoryMeta, GITHUB_BASE };
}
