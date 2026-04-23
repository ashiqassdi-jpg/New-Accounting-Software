# Custom Instructions for AI Coding Agent

## System Preservation Rule
- **CRITICAL**: When adding features or making modifications, always ensure the core system architecture, existing data, and company configurations are preserved.
- **NO DELETION**: Do not delete existing code, logic, or data unless explicitly requested by the user.
- **WARNING REQUIREMENT**: If a user request strictly necessitates the removal or destructive modification of existing features/data to function, you MUST explicitly warn the user and wait for confirmation before proceeding.
- **DATA INTEGRITY**: Maintain Supabase tables, schema, and current record sets at all costs during updates.
