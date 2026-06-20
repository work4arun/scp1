"""
Generate clean CSV files for migration, aligned with current Prisma schema.
- Only tasks with verticals
- No unique IDs (fresh inserts)
- No sub-verticals
- Maps: ownerRoleId → team_name, ownerUserId → member_email/name
- Split secondary team assignments into separate rows where needed
"""

import csv
import os

def parse_copy_section(lines, start_idx):
    rows = []
    i = start_idx
    while i < len(lines):
        line = lines[i]
        if line.strip() == r'\.':
            break
        fields = line.rstrip('\n').split('\t')
        parsed = [None if f == '\\N' else f for f in fields]
        rows.append(parsed)
        i += 1
    return rows, i + 1

def find_copy_sections(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    tables = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('COPY public.'):
            parts = line.split('(', 1)
            header_part = parts[0].strip()
            table_name = header_part.split('"')[1] if '"' in header_part else header_part.split('.')[1]
            col_part = parts[1].rsplit(')', 1)[0]
            cols = [c.strip().strip('"') for c in col_part.split(',')]
            rows, next_i = parse_copy_section(lines, i + 1)
            tables[table_name] = {'columns': cols, 'rows': rows}
            i = next_i
        else:
            i += 1
    return tables, lines

def main():
    sql_file = r'd:\college-projects\strategic-control-system\scp_db_backup_2026-06-16.sql'
    out_dir = r'd:\college-projects\strategic-control-system\csv_exports\clean'
    os.makedirs(out_dir, exist_ok=True)

    print("Parsing SQL backup...")
    tables, _ = find_copy_sections(sql_file)

    # === Build lookup dictionaries ===
    owner_roles = {}  # id -> {name, email, ownerName}
    users = {}
    verticals = {}
    priorities = {}

    for row in tables.get('OwnerRole', {}).get('rows', []):
        d = dict(zip(tables['OwnerRole']['columns'], row))
        owner_roles[d['id']] = {
            'name': d['name'], 'email': d.get('ownerEmail'),
            'contactName': d.get('ownerName'), 'active': d.get('active')
        }

    for row in tables.get('User', {}).get('rows', []):
        d = dict(zip(tables['User']['columns'], row))
        users[d['id']] = {'email': d['email'], 'name': d['name'], 'systemRole': d['systemRole']}

    for row in tables.get('Vertical', {}).get('rows', []):
        d = dict(zip(tables['Vertical']['columns'], row))
        verticals[d['id']] = {'name': d['name'], 'code': d['code']}

    for row in tables.get('Priority', {}).get('rows', []):
        d = dict(zip(tables['Priority']['columns'], row))
        priorities[d['id']] = {'code': d['code'], 'label': d['label'], 'rank': d['rank']}

    print(f"Lookups: {len(owner_roles)} roles, {len(users)} users, {len(verticals)} verticals, {len(priorities)} priorities")

    # === Parse tasks ===
    task_cols = tables['Task']['columns']
    tasks = [dict(zip(task_cols, row)) for row in tables['Task']['rows']]

    # === Filter: only tasks with verticalId and vertical EXISTS and NOT DROPPED ===
    valid_tasks = []
    dropped_count = 0
    for t in tasks:
        vid = t.get('verticalId')
        if vid and vid in verticals:
            status = t.get('status', '')
            if status
    print(f"Tasks with valid vertical: {len(valid_tasks)}")

    # === Count verticals with tasks ===
    vertical_task_count = {}
    for t in valid_tasks:
        vid = t['verticalId']
        vcode = verticals[vid]['code']
        vertical_task_count[vcode] = vertical_task_count.get(vcode, 0) + 1

    print("\nVerticals with tasks:")
    for vcode, count in sorted(vertical_task_count.items(), key=lambda x: -x[1]):
        print(f"  {vcode}: {count} tasks")

    # === Determine member email/name for each task ===
    # Priority: 1) ownerUserId → User.email/name  2) ownerRoleId → OwnerRole.ownerEmail/ownerName
    for t in valid_tasks:
        member_email = ''
        member_name = ''
        
        if t.get('ownerUserId') and t['ownerUserId'] in users:
            member_email = users[t['ownerUserId']]['email']
            member_name = users[t['ownerUserId']]['name']
        elif t.get('ownerRoleId') and t['ownerRoleId'] in owner_roles:
            member_email = owner_roles[t['ownerRoleId']].get('email') or ''
            member_name = owner_roles[t['ownerRoleId']].get('contactName') or ''
        
        t['_member_email'] = member_email
        t['_member_name'] = member_name

    # ================================================
    # FILE 1: Primary assignments (one row per task)
    # ================================================
    print("\n--- Generating clean tasks CSV ---")
    file1 = os.path.join(out_dir, 'tasks_master.csv')
    with open(file1, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            's_no', 'task_title', 'status', 'deadline', 'frequency',
            'intervention', 'expected_output',
            'vertical_name', 'vertical_code',
            'priority_code', 'priority_label',
            'team_name',
            'member_email', 'member_name',
            'secondary_team_name',
            'task_source',
            'description',
            'support_needed', 'delay_reason', 'next_action',
            'created_at', 'updated_at', 'dropped_at', 'drop_reason'
        ])
        
        for idx, t in enumerate(valid_tasks, 1):
            vid = t['verticalId']
            pid = t['priorityId']
            
            team_name = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '') if t.get('ownerRoleId') else ''
            sec_team = owner_roles.get(t.get('subOwnerId'), {}).get('name', '') if t.get('subOwnerId') else ''
            
            writer.writerow([
                idx,
                t.get('title', ''),
                t.get('status', ''),
                t.get('deadline', ''),
                t.get('frequency', ''),
                t.get('intervention', ''),
                t.get('expectedOutput', ''),
                verticals[vid]['name'],
                verticals[vid]['code'],
                priorities.get(pid, {}).get('code', ''),
                priorities.get(pid, {}).get('label', ''),
                team_name,
                t['_member_email'],
                t['_member_name'],
                sec_team,
                t.get('source', ''),
                t.get('description', ''),
                t.get('supportNeeded', ''),
                t.get('delayReason', ''),
                t.get('nextAction', ''),
                t.get('createdAt', ''),
                t.get('updatedAt', ''),
                t.get('droppedAt', ''),
                t.get('dropReason', '')
            ])
    print(f"  {file1}: {len(valid_tasks)} rows")

    # ================================================
    # FILE 2: Core fields only (what user requested)
    # ================================================
    print("\n--- Generating core fields CSV ---")
    file2 = os.path.join(out_dir, 'tasks_core.csv')
    with open(file2, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            's_no', 'task_title', 'status', 'deadline', 'frequency',
            'intervention', 'expected_output',
            'vertical_name', 'vertical_code',
            'priority_code',
            'team_name', 'member_email', 'member_name'
        ])
        
        for idx, t in enumerate(valid_tasks, 1):
            vid = t['verticalId']
            pid = t['priorityId']
            team_name = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '') if t.get('ownerRoleId') else ''
            
            writer.writerow([
                idx,
                t.get('title', ''),
                t.get('status', ''),
                t.get('deadline', ''),
                t.get('frequency', ''),
                t.get('intervention', ''),
                t.get('expectedOutput', ''),
                verticals[vid]['name'],
                verticals[vid]['code'],
                priorities.get(pid, {}).get('code', ''),
                team_name,
                t['_member_email'],
                t['_member_name']
            ])
    print(f"  {file2}: {len(valid_tasks)} rows")

    # ================================================
    # FILE 3: Tasks with secondary assignment (subOwnerId) as separate rows
    # ================================================
    print("\n--- Generating secondary team assignments CSV ---")
    file3 = os.path.join(out_dir, 'tasks_secondary_assignments.csv')
    secondary_count = 0
    with open(file3, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            's_no', 'task_title', 'status',
            'vertical_name', 'vertical_code',
            'priority_code',
            'team_name',  # this is the secondary team (subOwnerId)
            'member_email', 'member_name',
            'primary_team_name',
            'deadline', 'created_at'
        ])
        
        for t in valid_tasks:
            if t.get('subOwnerId') and t['subOwnerId'] in owner_roles:
                secondary_count += 1
                vid = t['verticalId']
                pid = t['priorityId']
                primary_team = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '') if t.get('ownerRoleId') else ''
                sec_team = owner_roles[t['subOwnerId']]['name']
                
                # Get contact info for secondary team
                sec_email = owner_roles[t['subOwnerId']].get('email') or ''
                sec_name = owner_roles[t['subOwnerId']].get('contactName') or ''
                
                writer.writerow([
                    secondary_count,
                    t.get('title', ''),
                    t.get('status', ''),
                    verticals[vid]['name'],
                    verticals[vid]['code'],
                    priorities.get(pid, {}).get('code', ''),
                    sec_team,
                    sec_email,
                    sec_name,
                    primary_team,
                    t.get('deadline', ''),
                    t.get('createdAt', '')
                ])
    print(f"  {file3}: {secondary_count} rows")

    # ================================================
    # FILE 4: Verticals summary (only those with tasks)
    # ================================================
    print("\n--- Generating verticals summary ---")
    file4 = os.path.join(out_dir, 'verticals_with_task_count.csv')
    with open(file4, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['vertical_name', 'vertical_code', 'task_count'])
        for vcode, count in sorted(vertical_task_count.items(), key=lambda x: -x[1]):
            vname = ''
            for vid, vdata in verticals.items():
                if vdata['code'] == vcode:
                    vname = vdata['name']
                    break
            writer.writerow([vname, vcode, count])
    print(f"  {file4}: {len(vertical_task_count)} rows")

    # ================================================
    # FILE 5: Team list (unique team names from ownerRoleId)
    # ================================================
    print("\n--- Generating unique team list ---")
    file5 = os.path.join(out_dir, 'teams_list.csv')
    unique_teams = {}
    for t in valid_tasks:
        rid = t.get('ownerRoleId')
        if rid and rid in owner_roles:
            r = owner_roles[rid]
            unique_teams[rid] = {
                'name': r['name'],
                'email': r.get('email') or '',
                'contact': r.get('contactName') or ''
            }
        sid = t.get('subOwnerId')
        if sid and sid in owner_roles and sid not in unique_teams:
            r = owner_roles[sid]
            unique_teams[sid] = {
                'name': r['name'],
                'email': r.get('email') or '',
                'contact': r.get('contactName') or ''
            }

    with open(file5, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['team_name', 'contact_email', 'contact_name', 'source', 'old_role_id'])
        for rid, rdata in sorted(unique_teams.items(), key=lambda x: x[1]['name']):
            # Count how many tasks reference this role as primary or secondary
            primary_count = sum(1 for t in valid_tasks if t.get('ownerRoleId') == rid)
            secondary_count = sum(1 for t in valid_tasks if t.get('subOwnerId') == rid)
            source = f"primary={primary_count}" + (f", secondary={secondary_count}" if secondary_count else "")
            writer.writerow([rdata['name'], rdata['email'], rdata['contact'], source, rid])
    print(f"  {file5}: {len(unique_teams)} unique teams")

    # ================================================
    # FILE 6: Tasks grouped by vertical (split CSV per vertical)
    # ================================================
    print("\n--- Generating per-vertical CSV files ---")
    per_vertical_dir = os.path.join(out_dir, 'by_vertical')
    os.makedirs(per_vertical_dir, exist_ok=True)
    
    tasks_by_vertical = {}
    for t in valid_tasks:
        vcode = verticals[t['verticalId']]['code']
        if vcode not in tasks_by_vertical:
            tasks_by_vertical[vcode] = []
        tasks_by_vertical[vcode].append(t)

    for vcode, vtasks in sorted(tasks_by_vertical.items()):
        fpath = os.path.join(per_vertical_dir, f'tasks_{vcode}.csv')
        with open(fpath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                's_no', 'task_title', 'status', 'deadline', 'frequency',
                'intervention', 'expected_output',
                'priority_code',
                'team_name', 'member_email', 'member_name'
            ])
            for idx, t in enumerate(vtasks, 1):
                pid = t['priorityId']
                team_name = owner_roles.get(t.get('ownerRoleId'), {}).get('name', '') if t.get('ownerRoleId') else ''
                writer.writerow([
                    idx, t.get('title', ''), t.get('status', ''),
                    t.get('deadline', ''), t.get('frequency', ''),
                    t.get('intervention', ''), t.get('expectedOutput', ''),
                    priorities.get(pid, {}).get('code', ''),
                    team_name, t['_member_email'], t['_member_name']
                ])
    print(f"  {per_vertical_dir}/: {len(tasks_by_vertical)} files")

    # ================================================
    # SUMMARY
    # ================================================
    print("\n" + "=" * 60)
    print("CLEAN CSV GENERATION COMPLETE")
    print("=" * 60)
    print(f"\nOutput directory: {out_dir}\n")
    for fname in sorted(os.listdir(out_dir)):
        fpath = os.path.join(out_dir, fname)
        if os.path.isfile(fpath):
            size = os.path.getsize(fpath)
            with open(fpath, 'r', encoding='utf-8-sig') as fh:
                rows = sum(1 for _ in fh) - 1
            print(f"  {fname:45s} {rows:>5} rows  ({size:>7,} bytes)")

    print(f"\n  by_vertical/ (directory)")
    for fname in sorted(os.listdir(per_vertical_dir)):
        fpath = os.path.join(per_vertical_dir, fname)
        size = os.path.getsize(fpath)
        with open(fpath, 'r', encoding='utf-8-sig') as fh:
            rows = sum(1 for _ in fh) - 1
        print(f"    {fname:43s} {rows:>5} rows  ({size:>7,} bytes)")

    # Print task distribution
    print(f"\n{'Vertical':10s} {'Count':>6s}")
    print("-" * 17)
    for vcode, count in sorted(vertical_task_count.items(), key=lambda x: -x[1]):
        print(f"{vcode:10s} {count:>6d}")

if __name__ == '__main__':
    main()