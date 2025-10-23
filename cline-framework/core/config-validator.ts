/**
 * Configuration Validation
 * Provides runtime validation of configuration with helpful error messages
 */

export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

/**
 * Validation rules
 */
export class ConfigValidator {
  private errors: ConfigValidationError[] = [];
  
  /**
   * Reset errors
   */
  reset(): void {
    this.errors = [];
  }
  
  /**
   * Add an error
   */
  private addError(field: string, message: string, value?: any, suggestion?: string): void {
    this.errors.push({ field, message, value, suggestion });
  }
  
  /**
   * Validate required field
   */
  required(field: string, value: any, message?: string): this {
    if (value === undefined || value === null || value === '') {
      this.addError(
        field,
        message || `Field "${field}" is required`,
        value,
        `Provide a value for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Validate string field
   */
  string(field: string, value: any, message?: string): this {
    if (value !== undefined && typeof value !== 'string') {
      this.addError(
        field,
        message || `Field "${field}" must be a string`,
        value,
        `Provide a string value for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Validate number field
   */
  number(field: string, value: any, message?: string): this {
    if (value !== undefined && typeof value !== 'number') {
      this.addError(
        field,
        message || `Field "${field}" must be a number`,
        value,
        `Provide a numeric value for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Validate boolean field
   */
  boolean(field: string, value: any, message?: string): this {
    if (value !== undefined && typeof value !== 'boolean') {
      this.addError(
        field,
        message || `Field "${field}" must be a boolean`,
        value,
        `Provide true or false for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Validate enum field
   */
  enum(field: string, value: any, allowedValues: any[], message?: string): this {
    if (value !== undefined && !allowedValues.includes(value)) {
      this.addError(
        field,
        message || `Field "${field}" must be one of: ${allowedValues.join(', ')}`,
        value,
        `Use one of: ${allowedValues.join(', ')}`
      );
    }
    return this;
  }
  
  /**
   * Validate minimum value
   */
  min(field: string, value: any, minValue: number, message?: string): this {
    if (value !== undefined && typeof value === 'number' && value < minValue) {
      this.addError(
        field,
        message || `Field "${field}" must be at least ${minValue}`,
        value,
        `Use a value >= ${minValue}`
      );
    }
    return this;
  }
  
  /**
   * Validate maximum value
   */
  max(field: string, value: any, maxValue: number, message?: string): this {
    if (value !== undefined && typeof value === 'number' && value > maxValue) {
      this.addError(
        field,
        message || `Field "${field}" must be at most ${maxValue}`,
        value,
        `Use a value <= ${maxValue}`
      );
    }
    return this;
  }
  
  /**
   * Validate range
   */
  range(field: string, value: any, min: number, max: number, message?: string): this {
    if (value !== undefined && typeof value === 'number' && (value < min || value > max)) {
      this.addError(
        field,
        message || `Field "${field}" must be between ${min} and ${max}`,
        value,
        `Use a value between ${min} and ${max}`
      );
    }
    return this;
  }
  
  /**
   * Validate pattern
   */
  pattern(field: string, value: any, pattern: RegExp, message?: string): this {
    if (value !== undefined && typeof value === 'string' && !pattern.test(value)) {
      this.addError(
        field,
        message || `Field "${field}" does not match required pattern`,
        value,
        `Provide a value matching pattern: ${pattern}`
      );
    }
    return this;
  }
  
  /**
   * Validate array field
   */
  array(field: string, value: any, message?: string): this {
    if (value !== undefined && !Array.isArray(value)) {
      this.addError(
        field,
        message || `Field "${field}" must be an array`,
        value,
        `Provide an array for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Validate object field
   */
  object(field: string, value: any, message?: string): this {
    if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      this.addError(
        field,
        message || `Field "${field}" must be an object`,
        value,
        `Provide an object for ${field}`
      );
    }
    return this;
  }
  
  /**
   * Custom validation
   */
  custom(field: string, value: any, validator: (value: any) => boolean, message: string, suggestion?: string): this {
    if (!validator(value)) {
      this.addError(field, message, value, suggestion);
    }
    return this;
  }
  
  /**
   * Get validation result
   */
  result(): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
    };
  }
  
  /**
   * Throw if invalid
   */
  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      const message = this.formatErrors();
      throw new ConfigValidationException(message, this.errors);
    }
  }
  
  /**
   * Format errors as string
   */
  private formatErrors(): string {
    const lines = ['Configuration validation failed:'];
    
    for (const error of this.errors) {
      lines.push(`  • ${error.field}: ${error.message}`);
      if (error.suggestion) {
        lines.push(`    Suggestion: ${error.suggestion}`);
      }
    }
    
    return lines.join('\n');
  }
}

/**
 * Validation error class
 */
export class ConfigValidationException extends Error {
  constructor(message: string, public validationErrors: ConfigValidationError[]) {
    super(message);
    this.name = 'ConfigValidationException';
  }
}

/**
 * Validate LLMClient config
 */
export function validateLLMClientConfig(config: any): ValidationResult {
  const validator = new ConfigValidator();
  
  validator
    .required('provider', config.provider)
    .enum('provider', config.provider, ['anthropic', 'openai', 'custom'])
    .required('apiKey', config.apiKey)
    .string('apiKey', config.apiKey)
    .required('model', config.model)
    .string('model', config.model);
  
  if (config.baseUrl !== undefined) {
    validator
      .string('baseUrl', config.baseUrl)
      .pattern('baseUrl', config.baseUrl, /^https?:\/\//, 'Base URL must start with http:// or https://');
  }
  
  if (config.defaultParams) {
    if (config.defaultParams.temperature !== undefined) {
      validator.range('defaultParams.temperature', config.defaultParams.temperature, 0, 1);
    }
    if (config.defaultParams.top_p !== undefined) {
      validator.range('defaultParams.top_p', config.defaultParams.top_p, 0, 1);
    }
    if (config.defaultParams.max_tokens !== undefined) {
      validator
        .number('defaultParams.max_tokens', config.defaultParams.max_tokens)
        .min('defaultParams.max_tokens', config.defaultParams.max_tokens, 1);
    }
  }
  
  return validator.result();
}

/**
 * Validate ClineAgent config
 */
export function validateClineAgentConfig(config: any): ValidationResult {
  const validator = new ConfigValidator();
  
  validator
    .required('apiProvider', config.apiProvider)
    .enum('apiProvider', config.apiProvider, ['anthropic', 'openai'])
    .required('apiKey', config.apiKey)
    .string('apiKey', config.apiKey);
  
  if (config.model !== undefined) {
    validator.string('model', config.model);
  }
  
  if (config.maxIterations !== undefined) {
    validator
      .number('maxIterations', config.maxIterations)
      .min('maxIterations', config.maxIterations, 1)
      .max('maxIterations', config.maxIterations, 100);
  }
  
  if (config.temperature !== undefined) {
    validator.range('temperature', config.temperature, 0, 1);
  }
  
  return validator.result();
}
