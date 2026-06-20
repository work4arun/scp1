"""
Parse scp_db_backup_2026-06-16.sql and extract:
1. Task data with ownerRoleId, ownerUserId, subOwnerId → mapped to readable names
2. OwnerRole → Team mapping
3. User data
4. Vertical and Priority lookup

Output: CSV files for review before cloud insertion.
"""

import csv
import os

def parse_copy_section(lines, start_idx):
    """Parse a PostgreSQL COPY ... FROM stdin; section returning list of row tuples."""
    rows = []
    i = start_idx
    while i < len(lines):
        line = lines[i]
        if line.strip() == r'\.':
            break
        # Tab-separated values with \N as NULL
        fields = line.rstrip('\n').split('\t')
        parsed = []
        for f in fields:
            if f == '\\N':
                parsed.append(None)
            else:
                parsed.append(f)
        rows.append(parsed)
        i += 1
    return rows, i + 1  # return rows and line after \.

def find_copy_sections(filepath):
    """Find all COPY sections in the SQL file and extract their data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    tables = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('COPY public.'):
            # Extract table name and columns
            parts = line.split('(', 1)
            header_part = parts[0].strip()  # e.g., COPY public."Task"
            table_name = header_part.split('"')[1] if '"' in header_part else header_part.split('.')[1]
            col_part = parts[1].rsplit(')', 1)[0]  # column list
            
            # Parse columns
            cols = []
            for c in col_part.split(','):
                c = c.strip().strip('"')
                cols.append(c)
            
            rows, next_i = parse_copy_section(lines, i + 1)
            tables[table_name] = {'columns': cols, 'rows': rows}
            i = next_i
        else:
            i += 1
    
    return tables, lines

def main():
    sql_file = r'd:\college-projects\strategic-control-system\scp_db_backup_2026-06-16.sql'
    out_dir = r'd:\college-projects\strategic-control-system\csv_exports'
    os.makedirs(out_dir, exist_ok=True)
    
    print("Parsing SQL backup file...")
    tables, _ = find_copy_sections(sql_file)
    
    print(f"Found {len(tables)} tables: {list(tables.keys())}")
    
    # Build lookup dictionaries
    owner_roles = {}   # id -> {name, email, ownerName}
    users = {}         # id -> {email, name, systemRole, ownerRoleId}
    verticals = {}     # id -> {name, code}
    priorities = {}    # id -> {code, label, rank}
    sub_verticals = {} # id -> {name, verticalId}
    
    if 'OwnerRole' in tables:
        cols = tables['OwnerRole']['columns']
        for row in tables['OwnerRole']['rows']:
            d = dict(zip(cols, row))
            owner_roles[d['id']] = {
                'name': d['name'],
                'description': d.get('description'),
                'email': d.get('ownerEmail'),
                'contactName': d.get('ownerName'),
                'active': d.get('active')
            }
        print(f"Parsed {len(owner_roles)} OwnerRoles")
    
    if 'User' in tables:
        cols = tables['User']['columns']
        for row in tables['User']['rows']:
            d = dict(zip(cols, row))
            users[d['id']] = {
                'email': d['email'],
                'name': d['name'],
                'systemRole': d['systemRole'],
                'ownerRoleId': d.get('ownerRoleId'),
                'active': d.get('active')
            }
        print(f"Parsed {len(users)} Users")
    
    if 'Vertical' in tables:
        cols = tables['Vertical']['columns']
        for row in tables['Vertical']['rows']:
            d = dict(zip(cols, row))
            verticals[d['id']] = {'name': d['name'], 'code': d['code']}
        print(f"Parsed {len(verticals)} Verticals")
    
    if 'Priority' in tables:
        cols = tables['Priority']['columns']
        for row in tables['Priority']['rows']:
            d = dict(zip(cols, row))
            priorities[d['id']] = {'code': d['code'], 'label': d['label'], 'rank': d['rank']}
        print(f"Parsed {len(priorities)} Priorities")
    
    if 'SubVertical' in tables:
        cols = tables['SubVertical']['columns']
        for row in tables['SubVertical']['rows']:
            d = dict(zip(cols, row))
            sub_verticals[d['id']] = {'name': d['name'], 'verticalId': d.get('verticalId')}
        print(f"Parsed {len(sub_verticals)} SubVerticals")
    
    # ============================================
    # EXPORT 1: OwnerRole → Team mapping
    # ============================================
    print("\n--- Exporting OwnerRole -> Team mapping ---")
    with open(os.path.join(out_dir, '1_owner_role_to_team.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['old_id', 'team_name', 'description', 'owner_email', 'owner_name', 'active'])
        for oid, odata in owner_roles.items():
            writer.writerow([oid, odata['name'], odata.get('description', ''),
                           odata.get('email', ''), odata.get('contactName', ''), odata.get('active', '')])
    print(f"  Wrote {len(owner_roles)} rows")
    
    # ============================================
    # EXPORT 2: Task data with mapped owner names
    # ============================================
    print("\n--- Exporting Task assignments ---")
    if 'Task' in tables:
        task_cols = tables['Task']['columns']
        tasks = []
        for row in tables['Task']['rows']:
            d = dict(zip(task_cols, row))
            tasks.append(d)
        
        # Export full task data with resolved names
        with open(os.path.join(out_dir, '2_tasks_with_assignments.csv'), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'old_task_id', 'task_code', 'task_title', 'status', 'source',
                'vertical_name', 'vertical_code',
                'sub_vertical_name',
                'priority_code', 'priority_label',
                'owner_role_name',        # → maps to Team (TaskTeamAssignment)
                'owner_user_name',        # → maps to User/TeamMember (TaskAssignment)
                'sub_owner_role_name',    # → maps to additional Team
                'created_by_name',
                'deadline', 'frequency',
                'description', 'support_needed', 'next_action',
                'intervention', 'expected_output',
                'created_at', 'updated_at', 'dropped_at', 'drop_reason',
                'sla_due_at', 'sla_breached_at'
            ])
            for t in tasks:
                # Resolve names
                vname = verticals.get(t.get('verticalId'), {}).get('name', '')
                vcode = verticals.get(t.get('verticalId'), {}).get('code', '')
                svname = sub_verticals.get(t.get('subVerticalId'), {}).get('name', '')
                pcode = priorities.get(t.get('priorityId'), {}).get('code', '')
                plabel = priorities.get(t.get('priorityId'), {}).get('label', '')
                owname = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '')
                subowname = owner_roles.get(t.get('subOwnerId'), {}).get('name', '')
                username = users.get(t.get('ownerUserId'), {}).get('name', '')
                creatorname = users.get(t.get('createdById'), {}).get('name', '')
                
                writer.writerow([
                    t.get('id'), t.get('code'), t.get('title'), t.get('status'), t.get('source'),
                    vname, vcode,
                    svname,
                    pcode, plabel,
                    owname,         # ownerRoleId → Team name
                    username,       # ownerUserId → User name
                    subowname,      # subOwnerId → Team name
                    creatorname,
                    t.get('deadline'), t.get('frequency'),
                    t.get('description'), t.get('supportNeeded'), t.get('nextAction'),
                    t.get('intervention'), t.get('expectedOutput'),
                    t.get('createdAt'), t.get('updatedAt'), t.get('droppedAt'), t.get('dropReason'),
                    t.get('slaDueAt'), t.get('slaBreachedAt')
                ])
        print(f"  Wrote {len(tasks)} task rows")
        
        # ============================================
        # EXPORT 3: Only tasks that HAVE an ownerRoleId or ownerUserId or subOwnerId
        # ============================================
        print("\n--- Exporting tasks WITH owner assignments only ---")
        with open(os.path.join(out_dir, '3_tasks_with_owners_only.csv'), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'old_task_id', 'task_code', 'task_title', 'status',
                'vertical_name',
                'priority_label',
                'owner_role_name',       # → Team (TaskTeamAssignment)
                'owner_role_id',
                'owner_user_name',       # → User (TaskAssignment - if in TeamMember)
                'owner_user_id',
                'sub_owner_role_name',   # → secondary Team
                'sub_owner_id',
                'deadline',
                'created_at'
            ])
            count = 0
            for t in tasks:
                has_owner = t.get('ownerRoleId') or t.get('ownerUserId') or t.get('subOwnerId')
                if has_owner:
                    vname = verticals.get(t.get('verticalId'), {}).get('name', '')
                    plabel = priorities.get(t.get('priorityId'), {}).get('label', '')
                    owname = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '')
                    username = users.get(t.get('ownerUserId'), {}).get('name', '') if t.get('ownerUserId') else ''
                    subowname = owner_roles.get(t.get('subOwnerId'), {}).get('name', '') if t.get('subOwnerId') else ''
                    
                    writer.writerow([
                        t.get('id'), t.get('code'), t.get('title'), t.get('status'),
                        vname, plabel,
                        owname, t.get('ownerRoleId') or '',
                        username, t.get('ownerUserId') or '',
                        subowname, t.get('subOwnerId') or '',
                        t.get('deadline'), t.get('createdAt')
                    ])
                    count += 1
        print(f"  Wrote {count} task rows with owner assignments")
    
    # ============================================
    # EXPORT 4: Summary - tasks needing mapping to new schema
    # ============================================
    print("\n--- Exporting migration mapping summary ---")
    if 'Task' in tables:
        with open(os.path.join(out_dir, '4_migration_mapping.csv'), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'old_task_id', 'task_code', 'task_title', 'status',
                # New schema: Task fields
                'vertical_id', 'priority_id', 'created_by_id',
                # New schema: TaskTeamAssignment (from old ownerRoleId)
                'team_name_to_assign', 'old_owner_role_id',
                # New schema: TaskTeamAssignment (from old subOwnerId)
                'secondary_team_name', 'old_sub_owner_id',
                # New schema: TaskAssignment (from old ownerUserId)
                'user_name_to_assign', 'old_owner_user_id',
                # Notes
                'mapping_notes'
            ])
            count = 0
            for t in tasks:
                has_owner = t.get('ownerRoleId') or t.get('ownerUserId') or t.get('subOwnerId')
                if has_owner:
                    owname = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '')
                    username = users.get(t.get('ownerUserId'), {}).get('name', '') if t.get('ownerUserId') else ''
                    subowname = owner_roles.get(t.get('subOwnerId'), {}).get('name', '') if t.get('subOwnerId') else ''
                    
                    notes = []
                    if t.get('ownerRoleId'):
                        notes.append(f"Create TaskTeamAssignment for team '{owname}' (old ownerRoleId={t['ownerRoleId']})")
                    if t.get('subOwnerId'):
                        notes.append(f"Create TaskTeamAssignment for team '{subowname}' (old subOwnerId={t['subOwnerId']})")
                    if t.get('ownerUserId'):
                        notes.append(f"Find/create TeamMember for user '{username}' (old ownerUserId={t['ownerUserId']}) and create TaskAssignment")
                    if not any([t.get('ownerRoleId'), t.get('ownerUserId'), t.get('subOwnerId')]):
                        notes.append("No owner assigned - task has no assignee in old system")
                    
                    writer.writerow([
                        t.get('id'), t.get('code'), t.get('title'), t.get('status'),
                        t.get('verticalId') or '', t.get('priorityId') or '', t.get('createdById') or '',
                        owname, t.get('ownerRoleId') or '',
                        subowname, t.get('subOwnerId') or '',
                        username, t.get('ownerUserId') or '',
                        ' | '.join(notes)
                    ])
                    count += 1
        
        print(f"  Wrote {count} mapping rows")
    
    # ============================================
    # EXPORT 5: Users with their OwnerRole
    # ============================================
    print("\n--- Exporting Users ---")
    with open(os.path.join(out_dir, '5_users.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['old_user_id', 'email', 'name', 'system_role', 'owner_role_name', 'owner_role_id', 'active'])
        for uid, udata in users.items():
            or_name = owner_roles.get(udata.get('ownerRoleId'), {}).get('name', '') if udata.get('ownerRoleId') else ''
            writer.writerow([uid, udata['email'], udata['name'], udata['systemRole'], or_name, udata.get('ownerRoleId', ''), udata.get('active', '')])
    print(f"  Wrote {len(users)} user rows")
    
    # ============================================
    # EXPORT 6: Verticals
    # ============================================
    print("\n--- Exporting Verticals ---")
    with open(os.path.join(out_dir, '6_verticals.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['old_vertical_id', 'name', 'code'])
        for vid, vdata in verticals.items():
            writer.writerow([vid, vdata['name'], vdata['code']])
    print(f"  Wrote {len(verticals)} vertical rows")
    
    # ============================================
    # EXPORT 7: Priorities
    # ============================================
    print("\n--- Exporting Priorities ---")
    with open(os.path.join(out_dir, '7_priorities.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['old_priority_id', 'code', 'label', 'rank'])
        for pid, pdata in priorities.items():
            writer.writerow([pid, pdata['code'], pdata['label'], pdata['rank']])
    print(f"  Wrote {len(priorities)} priority rows")
    
    # ============================================
    # SUMMARY
    # ============================================
    print("\n" + "="*60)
    print("EXTRACTION COMPLETE")
    print("="*60)
    print(f"\nAll CSV files saved to: {out_dir}")
    print("\nFiles created:")
    for fname in os.listdir(out_dir):
        fpath = os.path.join(out_dir, fname)
        size = os.path.getsize(fpath)
        print(f"  {fname} ({size:,} bytes)")

if __name__ == '__main__':
    main()