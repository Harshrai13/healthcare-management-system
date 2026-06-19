const { Service } = require('../models');
const { AppError, ErrorCodes } = require('../utils/AppError');

async function getAllServices(req, res, next) {
  try {
    const services = await Service.find({ isActive: true })
      .select('_id name slug description icon')
      .sort({ sortOrder: 1 });
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
}

async function getServiceBySlug(req, res, next) {
  try {
    const service = await Service.findOne({ slug: req.params.slug });
    if (!service) {
      throw new AppError('Service not found.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
}

async function createService(req, res, next) {
  try {
    const { name, slug, description, icon, sortOrder } = req.body;
    const service = await Service.create({
      name,
      slug,
      description,
      icon,
      sortOrder: sortOrder || 0,
    });
    res.status(201).json({ success: true, message: 'Service created successfully.', data: service });
  } catch (error) {
    next(error);
  }
}

async function updateService(req, res, next) {
  try {
    const { name, slug, description, icon, isActive, sortOrder } = req.body;
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { name, slug, description, icon, isActive, sortOrder },
      { new: true }
    );
    res.json({ success: true, message: 'Service updated successfully.', data: service });
  } catch (error) {
    next(error);
  }
}

async function deleteService(req, res, next) {
  try {
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Service deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getAllServices, getServiceBySlug, createService, updateService, deleteService };
