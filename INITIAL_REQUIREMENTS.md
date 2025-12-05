# MP3 File Analysis API - Initial Requirements & Context

## Task Overview

Create an API endpoint that accepts an MP3 file and responds with the number of frames in the file.

## API Specification

- **Endpoint**: `/file-upload`
- **Method**: POST
- **Accepts**: MP3 file upload
- **Scope**: MPEG Version 1 Audio Layer 3 files only
- **Response Format**:
```json
{
  "frameCount": <number>
}
```

## Technical Requirements

1. Must use TypeScript
2. Must parse the MP3 file to logically count frames
3. **Must NOT use NPM packages to parse MP3 frame data directly**
4. NPM packages allowed for: utilities, HTTP framework, etc.
5. Must respond with correct frame count in specified JSON format

## Evaluation Criteria

### Correctness
- Solution meets requirements
- Correct frame count determination
- Appropriate error handling

### Code Quality
- Well-organised, readable, maintainable code
- TypeScript good practices
- Effective use of TypeScript features
- Standardised tooling (formatting, linting, testing)

### Error Handling
- Appropriate implementation
- Graceful error handling
- Useful error messages

### Scalability
- Ability to handle large files
- Performance optimisation

### Approach
- Effective Git usage
- Structured approach evidence

## Learnings from Previous Candidates' Feedback

### Common Failure Points:
1. **Off-by-one frame counting errors** - Critical to verify exact count
2. **ID3 metadata validation issues** - Must handle ID3v1/ID3v2 tags properly
3. **Inconsistent code patterns** - Code should be clean and consistent
4. **Over-engineering** - Avoid serverless, complex streaming unless necessary
5. **Under-engineering** - Single file solutions lack structure
6. **Missing type definitions** - Don't rely solely on inferred types
7. **Tests that don't verify actual logic** - Tests must check frame counting accuracy
8. **Not verifying before submission** - Always test with multiple files

### What Worked Well:
- Docker packaging and deployment pipeline
- Basic logging (but should be leveraged more)
- Comments explaining decisions
- Builder pattern for mock data in tests
- Simple, straightforward solutions that work

## Verification

Use `mediainfo` or similar tools to verify frame counts before submission.

## Reference

Original task: https://you.ashbyhq.com/foundationhealthcareers/assignment/29e0cd6e-cf59-4620-a89e-090f32aa268e
