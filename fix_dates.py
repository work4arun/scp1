"""Fix seed_migrate.ts to use original timestamps from CSV"""

with open("prisma/seed_migrate.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Change CSV source
content = content.replace(
    'csv_exports/clean/tasks_core.csv',
    'csv_exports/clean/tasks_master.csv'
)

# Fix 2: Replace createdAt: new Date() with original timestamp
# Find the exact line pattern
old_line = "        createdAt: new Date(),"
new_lines = "        const rawRow = row as unknown as Record<string, string>;\n    const originalCreatedAt = parseDate(rawRow[\"created_at\"]);\n\n    const task = await prisma.task.create({\n      data: {\n        code: taskCode,\n        title: row.task_title,\n        status: mapStatus(row.status),\n        source: \"SELF_STRATEGY\" as TaskSource,\n        verticalId: verticalMap[vcode],\n        priorityId: priorityMap[row.priority_code] || priorityMap[\"P3\"],\n        createdById: sm.id,\n        deadline: deadline || undefined,\n        frequency: row.frequency || undefined,\n        intervention: mapIntervention(row.intervention),\n        expectedOutput: row.expected_output || undefined,\n        createdAt: originalCreatedAt || new Date(),"

# Find the block to replace
old_block = """    const task = await prisma.task.create({
      data: {
        code: taskCode,
        title: row.task_title,
        status: mapStatus(row.status),
        source: "SELF_STRATEGY" as TaskSource,
        verticalId: verticalMap[vcode],
        priorityId: priorityMap[row.priority_code] || priorityMap["P3"],
        createdById: sm.id,
        deadline: deadline || undefined,
        frequency: row.frequency || undefined,
        intervention: mapIntervention(row.intervention),
        expectedOutput: row.expected_output || undefined,
        createdAt: new Date(),"""

new_block = """    const rawRow = row as unknown as Record<string, string>;
    const originalCreatedAt = parseDate(rawRow["created_at"]);

    const task = await prisma.task.create({
      data: {
        code: taskCode,
        title: row.task_title,
        status: mapStatus(row.status),
        source: "SELF_STRATEGY" as TaskSource,
        verticalId: verticalMap[vcode],
        priorityId: priorityMap[row.priority_code] || priorityMap["P3"],
        createdById: sm.id,
        deadline: deadline || undefined,
        frequency: row.frequency || undefined,
        intervention: mapIntervention(row.intervention),
        expectedOutput: row.expected_output || undefined,
        createdAt: originalCreatedAt || new Date(),"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("✓ Task creation block replaced.")
else:
    print("✗ Old block not found - checking with different indentation...")
    # Try with 4-space indent lines
    for line_variant in [
        '    const task = await prisma.task.create({',
        '  const task = await prisma.task.create({'
    ]:
        if line_variant in content:
            print(f"Found variant: {repr(line_variant)}")
            idx = content.index(line_variant)
            print(f"Context around line:\n{content[idx:idx+500]}")

with open("prisma/seed_migrate.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Done.")