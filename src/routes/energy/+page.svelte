<script lang="ts">
	export let data: any;

	const { timeline, energyMarkers, energyScale, zone, success, error } = data;

	// Format date for display
	function formatDateTime(date: Date): string {
		return date.toLocaleString('no-NO', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Format price for display
	function formatPrice(price: number | undefined): string {
		if (price === undefined) return 'N/A';
		return `${price.toFixed(4)} NOK`;
	}

	// Format EUR price for display
	function formatEurPrice(price: number | undefined): string {
		if (price === undefined) return 'N/A';
		return `${price.toFixed(4)} EUR`;
	}
</script>

<svelte:head>
	<title>Energy Price Data - Timeviz</title>
</svelte:head>

<div class="energy-page">
	<h1>Energy Price Data</h1>

	{#if error}
		<div class="error-message">
			<h2>⚠️ Error Loading Data</h2>
			<p>{error}</p>
		</div>
	{:else}
		<div class="info-section">
			<h2>Timeline Information</h2>
			<table class="info-table">
				<tbody>
					<tr>
						<td><strong>Zone:</strong></td>
						<td>{zone}</td>
					</tr>
					<tr>
						<td><strong>From:</strong></td>
						<td>{formatDateTime(timeline.from.ts)}</td>
					</tr>
					<tr>
						<td><strong>To:</strong></td>
						<td>{formatDateTime(timeline.to.ts)}</td>
					</tr>
					<tr>
						<td><strong>Data Points:</strong></td>
						<td>{energyMarkers.length}</td>
					</tr>
					<tr>
						<td><strong>Scale Min:</strong></td>
						<td>{energyScale.min.toFixed(4)} NOK/kWh</td>
					</tr>
					<tr>
						<td><strong>Scale Max:</strong></td>
						<td>{energyScale.max.toFixed(4)} NOK/kWh</td>
					</tr>
					<tr>
						<td><strong>Scale Height:</strong></td>
						<td>{energyScale.height}px</td>
					</tr>
				</tbody>
			</table>
		</div>

		{#if energyMarkers.length > 0}
			<div class="data-section">
				<h2>Energy Price Markers</h2>
				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Timestamp</th>
								<th>Time String</th>
								<th>NOK/kWh</th>
								<th>EUR/kWh</th>
								<th>Exchange Rate</th>
								<th>Zone</th>
								<th>X Coordinate</th>
								<th>Y Coordinate</th>
								<th>Data Type</th>
							</tr>
						</thead>
						<tbody>
							{#each energyMarkers as marker, i}
								<tr class:odd={i % 2 === 1}>
									<td>{i + 1}</td>
									<td>{formatDateTime(marker.ts)}</td>
									<td>{marker.tstr}</td>
									<td class="price">{formatPrice(marker.nokPerKwh)}</td>
									<td class="price">{formatEurPrice(marker.eurPerKwh)}</td>
									<td>{marker.exchangeRate?.toFixed(3) || 'N/A'}</td>
									<td>{marker.zone || 'N/A'}</td>
									<td>{marker.x?.toFixed(2) || 'N/A'}</td>
									<td>{marker.y?.toFixed(2) || 'N/A'}</td>
									<td>{marker.dataType || 'N/A'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div class="no-data-message">
				<h2>No Energy Data Available</h2>
				<p>No energy price markers were found for the specified time period.</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.energy-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		color: #1f2937;
		margin-bottom: 20px;
	}

	h2 {
		color: #374151;
		margin-bottom: 15px;
		font-size: 1.25rem;
	}

	.error-message {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 20px;
		margin: 20px 0;
		color: #991b1b;
	}

	.info-section {
		background-color: #f9fafb;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 30px;
	}

	.info-table {
		width: 100%;
		border-collapse: collapse;
	}

	.info-table td {
		padding: 8px 12px;
		border-bottom: 1px solid #e5e7eb;
	}

	.info-table td:first-child {
		width: 150px;
	}

	.data-section {
		margin-top: 30px;
	}

	.table-container {
		overflow-x: auto;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		background-color: white;
		min-width: 800px;
	}

	.data-table th {
		background-color: #f9fafb;
		color: #374151;
		font-weight: 600;
		padding: 12px 8px;
		text-align: left;
		border-bottom: 2px solid #e5e7eb;
		font-size: 0.875rem;
	}

	.data-table td {
		padding: 10px 8px;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	.data-table tr:hover {
		background-color: #f9fafb;
	}

	.data-table tr.odd {
		background-color: #fafafa;
	}

	.data-table tr.odd:hover {
		background-color: #f3f4f6;
	}

	.price {
		font-family: 'Courier New', monospace;
		text-align: right;
		font-weight: 600;
	}

	.no-data-message {
		text-align: center;
		padding: 40px;
		background-color: #f9fafb;
		border-radius: 8px;
		color: #6b7280;
	}

	@media (max-width: 768px) {
		.energy-page {
			padding: 10px;
		}

		.data-table {
			font-size: 0.75rem;
		}

		.data-table th,
		.data-table td {
			padding: 6px 4px;
		}
	}
</style>
