  const executeCommand = async () => {
    if (!commandInput.trim()) return;
    
    const command = commandInput.trim();
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    // Add command to output
    setCommandOutput(prev => [...prev, `> ${command}`]);
    
    try {
      if (cmd === '/rank') {
        const rank = parseInt(parts[1]);
        const targetUsername = parts.slice(2).join(' ');
        
        if (isNaN(rank) || !targetUsername) {
          setCommandOutput(prev => [...prev, 'Error: Invalid syntax. Usage: /rank <0-5> <username>']);
          setCommandInput('');
          return;
        }
        
        if (rank < 0 || rank > 5) {
          setCommandOutput(prev => [...prev, 'Error: Rank must be between 0-5']);
          setCommandInput('');
          return;
        }
        
        // Call the set rank API
        const response = await fetch(fn('admin/set-rank'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername: username, targetUsername, rank })
        });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ ${data.message}`]);
          await fetchUsers();
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else if (cmd === '/publish_update') {
        // Call the publish update API
        const response = await fetch(fn('admin/publish-update'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername: username })
        });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ ${data.message}`]);
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else if (cmd === '/code') {
        // Call the code access API (Rank 5 only)
        const response = await fetch(fn('code'), { method: 'GET', headers: { 'X-Username': username } });
        
        const data = await response.json();
        if (data.success) {
          setCommandOutput(prev => [...prev, `✓ Access granted. Source code:`]);
          setCommandOutput(prev => [...prev, `${data.sourceCode}`]);
        } else {
          setCommandOutput(prev => [...prev, `✗ Error: ${data.error}`]);
        }
      } else {
        setCommandOutput(prev => [...prev, `Error: Unknown command "${cmd}"`]);
      }
    } catch (error) {
      setCommandOutput(prev => [...prev, `✗ Error: ${String(error)}`]);
    }
    
    setCommandInput('');
  };
