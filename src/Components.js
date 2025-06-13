import React, { useState, useEffect } from 'react';
import { Box, Typography, Fab, Button, Card, CardContent, CardActionArea, Grid, Chip } from '@mui/material';
import { Folder, Add, LibraryBooks, Image } from '@mui/icons-material';

const Components = () => {
	const [libraryComponents, setLibraryComponents] = useState([]);

	const formatDate = (date) => {
		if (!date) return 'N/A';
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	};

	return (
		<Box>
		<Box
			sx={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				mb: 3
			}}
		>
			<Typography variant="h4" sx={{ fontWeight: 600 }}>
				Component Library
			</Typography>
		</Box>

		<Grid container spacing={3}>
			{libraryComponents.map(component => (
				<Grid item xs={12} sm={6} md={4} lg={3} key={component.id}>
					<Card
						sx={{
							height: '100%',
							'&:hover': {
								boxShadow: 4,
								transform: 'translateY(-2px)',
								transition: 'all 0.2s ease-in-out'
							}
						}}
					>
						<CardActionArea sx={{ height: '100%' }}>
							<Box
								sx={{
									height: 120,
									bgcolor: '#f8f9fa',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									borderBottom: '1px solid #e0e0e0'
								}}
							>
								{component.thumbnail ? (
									<img
										src={component.thumbnail}
										alt={component.name}
										style={{
											maxWidth: '100%',
											maxHeight: '100%',
											objectFit: 'contain'
										}}
									/>
								) : (
									<Image
										sx={{ fontSize: 40, color: 'text.secondary' }}
									/>
								)}
							</Box>
							<CardContent>
								<Typography
									variant="h6"
									sx={{ fontWeight: 600, mb: 1 }}
								>
									{component.name}
								</Typography>
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										mb: 1
									}}
								>
									<Chip
										label={component.type}
										size="small"
										sx={{
											color: 'white',
											fontWeight: 500,
											textTransform: 'capitalize'
										}}
									/>
									<Typography variant="caption" color="text.secondary">
										Used {component.usageCount} times
									</Typography>
								</Box>
								<Typography variant="caption" color="text.secondary">
									Created: {formatDate(component.createdDate)}
								</Typography>
							</CardContent>
						</CardActionArea>
					</Card>
				</Grid>
			))}
		</Grid>

		{libraryComponents.length === 0 && (
			<Box sx={{ textAlign: 'center', mt: 8 }}>
				<LibraryBooks
					sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
				/>
				<Typography variant="h6" color="text.secondary" gutterBottom>
					No components in library
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Save components from your projects to build your library
				</Typography>
			</Box>
		)}
	</Box>
	);
};

export default Components;